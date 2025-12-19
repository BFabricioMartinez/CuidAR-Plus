"""
Servicio para enviar notificaciones push a usuarios.
Utiliza pywebpush para enviar notificaciones siguiendo el estándar Web Push Protocol.
"""

import json
import os
import time
import base64
import requests
from typing import Optional, List
from pywebpush import WebPushException
from py_vapid import Vapid
from http_ece import encrypt
from urllib.parse import urlparse
from jose import jwt as jose_jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from models.push_subscription import PushSubscription, PushNotificationPayload
import logging

logger = logging.getLogger(__name__)

# Configuración VAPID desde variables de entorno
# Las claves pueden venir con \n literales, hay que reemplazarlos por saltos reales
_vapid_private_key_raw = os.getenv("VAPID_PRIVATE_KEY", "").replace("\\n", "\n").strip()
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "").replace("\\n", "\n").strip()

# VAPID_EMAIL debe tener formato mailto: según el protocolo VAPID
_email = os.getenv("VAPID_EMAIL", "admin@cuidar.com")
VAPID_EMAIL = _email if _email.startswith("mailto:") else f"mailto:{_email}"

# Preparar clave privada VAPID en formato correcto
# Estrategia: Crear objeto Vapid para validar, luego obtener la clave PEM normalizada
# Esto asegura que la clave esté en el formato exacto que pywebpush espera
_vapid_obj = None
VAPID_PRIVATE_KEY = None

if _vapid_private_key_raw and _vapid_private_key_raw.startswith("-----BEGIN"):
    try:
        # Limpiar la clave: asegurar que tenga saltos de línea correctos
        cleaned_key = _vapid_private_key_raw.strip()
        
        # Crear objeto Vapid para validar y normalizar
        _vapid_obj = Vapid.from_pem(cleaned_key.encode('utf-8'))
        
        # Obtener la clave PEM normalizada desde el objeto Vapid
        # Esto asegura que esté en el formato exacto que pywebpush espera
        VAPID_PRIVATE_KEY = _vapid_obj.private_pem().decode('utf-8')
        
        logger.info("Clave VAPID cargada y normalizada correctamente")
        
        # Verificar que la clave pública derivada coincida con la del .env
        try:
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.backends import default_backend
            import base64
            
            private_key = serialization.load_pem_private_key(
                cleaned_key.encode('utf-8'),
                password=None,
                backend=default_backend()
            )
            public_key = private_key.public_key()
            public_bytes = public_key.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint
            )
            derived_public = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
            
            if derived_public != VAPID_PUBLIC_KEY:
                logger.warning(f"ADVERTENCIA: La clave publica del .env no coincide con la derivada de la privada!")
                logger.warning(f"  Clave publica en .env: {VAPID_PUBLIC_KEY}")
                logger.warning(f"  Clave publica derivada: {derived_public}")
                logger.warning("  Esto causara BadJwtToken. Verifica que las claves coincidan.")
            else:
                logger.info("Claves VAPID verificadas: la clave publica coincide con la privada")
        except Exception as e:
            logger.warning(f"No se pudo verificar coincidencia de claves: {e}")
            
    except Exception as e:
        logger.error(f"Error al cargar clave VAPID: {e}")
        import traceback
        logger.error(traceback.format_exc())
        _vapid_obj = None
        VAPID_PRIVATE_KEY = None

if not VAPID_PRIVATE_KEY:
    logger.error("VAPID_PRIVATE_KEY no está configurada o tiene formato inválido")


class PushNotificationService:
    """Servicio para gestionar notificaciones push"""

    @staticmethod
    async def send_to_user(
        db: AsyncSession,
        user_id: int,
        payload: PushNotificationPayload
    ) -> dict:
        """
        Envía una notificación push a todos los dispositivos de un usuario.

        Args:
            db: Sesión de base de datos
            user_id: ID del usuario destinatario
            payload: Contenido de la notificación

        Returns:
            dict con resultados del envío
        """
        # Validar configuración VAPID
        if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
            logger.error("VAPID keys no configuradas o inválidas")
            return {
                "success": False,
                "error": "VAPID keys no configuradas en el servidor"
            }

        # Asegurar que user_id sea int (puede venir como string del JWT)
        user_id = int(user_id)

        # Obtener todas las suscripciones del usuario
        result = await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
        subscriptions = result.scalars().all()

        if not subscriptions:
            logger.warning(f"Usuario {user_id} no tiene suscripciones push")
            return {
                "success": False,
                "error": "Usuario no tiene dispositivos suscritos"
            }

        # Preparar payload
        notification_data = {
            "title": payload.title,
            "body": payload.body,
            "icon": payload.icon,
            "badge": payload.badge,
            "tag": payload.tag,
            "data": payload.data or {}
        }

        # Enviar a cada dispositivo
        sent_count = 0
        failed_subscriptions = []

        for subscription in subscriptions:
            try:
                # Construir subscription_info para pywebpush
                subscription_info = {
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh_key,
                        "auth": subscription.auth_key
                    }
                }

                # Extraer el origen del endpoint para el claim "aud"
                # El audience DEBE ser exactamente el origen sin path ni trailing slash
                # Ejemplo: https://fcm.googleapis.com/... -> https://fcm.googleapis.com
                from urllib.parse import urlparse
                parsed = urlparse(subscription.endpoint)
                # Asegurar que el audience sea exactamente scheme://netloc sin trailing slash
                audience = f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
                
                # GENERACIÓN MANUAL DEL JWT Y ENVÍO
                # Esto nos da control total sobre el proceso y evita problemas con pywebpush
                
                # 1. Preparar claims VAPID - todos son obligatorios para un JWT válido
                vapid_claims = {
                    "sub": VAPID_EMAIL,  # Subject: debe ser mailto:email
                    "aud": audience,      # Audience: debe ser el origen del endpoint
                    "exp": int(time.time()) + 86400,  # Expiration: 24 horas desde ahora
                    "iat": int(time.time())  # Issued At: ahora
                }
                
                # 2. Generar JWT usando el objeto Vapid directamente
                # py_vapid está diseñado específicamente para generar JWTs VAPID con el formato correcto
                # Esto asegura compatibilidad con todos los servicios push (Apple, FCM, Mozilla, etc.)
                if not _vapid_obj:
                    raise ValueError("Objeto Vapid no está inicializado")
                
                # El objeto Vapid tiene un método sign() que genera el JWT desde claims
                # Esto genera el JWT con el formato exacto que los servicios push esperan
                # El método sign() de py_vapid genera el JWT con el formato correcto para VAPID
                jwt_token = _vapid_obj.sign(vapid_claims)
                
                # 3. Obtener la clave pública en formato base64 URL-safe para los headers
                # Usamos la clave pública del .env que ya está verificada
                public_key_b64 = VAPID_PUBLIC_KEY
                
                # 4. Preparar headers VAPID según el estándar Web Push
                # Formato: Authorization: vapid t=<JWT>, k=<public_key>
                # También incluir Crypto-Key para compatibilidad con Apple Push Service
                headers = {
                    "Authorization": f"vapid t={jwt_token}, k={public_key_b64}",
                    "Crypto-Key": f"p256ecdsa={public_key_b64}",  # Requerido por Apple Push Service
                    "Content-Type": "application/octet-stream",
                    "Content-Encoding": "aes128gcm",
                    "TTL": "86400"  # 24 horas
                }
                
                # 5. Encriptar el payload usando http-ece
                # Convertir las claves de base64 URL-safe a bytes
                # Agregar padding si es necesario
                p256dh_padding = (4 - len(subscription.p256dh_key) % 4) % 4
                auth_padding = (4 - len(subscription.auth_key) % 4) % 4
                p256dh_bytes = base64.urlsafe_b64decode(subscription.p256dh_key + '=' * p256dh_padding)
                auth_bytes = base64.urlsafe_b64decode(subscription.auth_key + '=' * auth_padding)
                
                # Generar una clave privada efímera (ephemeral) para cada mensaje
                # Esto es necesario para el intercambio Diffie-Hellman con la clave pública del cliente
                ephemeral_private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
                
                # Encriptar el payload según el estándar Web Push Encryption
                # http-ece requiere: payload, private_key (clave privada efímera del servidor),
                # dh (clave pública del cliente), authSecret (clave de autenticación)
                payload_data = json.dumps(notification_data).encode('utf-8')
                try:
                    encrypted_payload = encrypt(
                        payload_data,
                        private_key=ephemeral_private_key,  # Clave privada efímera del servidor
                        dh=p256dh_bytes,   # Clave pública del cliente (p256dh)
                        auth_secret=auth_bytes,  # Clave de autenticación del cliente
                        version="aes128gcm"  # Versión de encriptación
                    )
                except Exception as e:
                    logger.error(f"Error encriptando payload: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    raise
                
                # 6. Enviar la petición HTTP directamente
                response = requests.post(
                    subscription.endpoint,
                    data=encrypted_payload,
                    headers=headers,
                    timeout=30
                )
                
                # 7. Verificar respuesta
                if response.status_code == 201:
                    # Éxito
                    sent_count += 1
                    logger.info(f"Notificación enviada a subscription {subscription.id}")
                elif response.status_code == 410:
                    # Endpoint expirado
                    failed_subscriptions.append(subscription.id)
                    logger.info(f"Subscription {subscription.id} expirada (410), se eliminará")
                elif response.status_code == 403:
                    # BadJwtToken - generalmente significa que la suscripción fue creada con una clave pública diferente
                    failed_subscriptions.append(subscription.id)
                    logger.warning(f"BadJwtToken para subscription {subscription.id} (403)")
                    logger.warning(f"  Response body: {response.text}")
                    logger.warning(f"  Endpoint: {subscription.endpoint[:100]}...")
                    logger.warning(f"  Audience: {audience}")
                    logger.warning(f"  Public key actual: {public_key_b64[:50]}...")
                    logger.warning(f"  SOLUCION: El usuario debe volver a suscribirse con la clave publica actual")
                    logger.warning(f"  La suscripcion fue creada con una clave publica diferente")
                else:
                    # Otro error
                    failed_subscriptions.append(subscription.id)
                    logger.error(f"Error HTTP {response.status_code} para subscription {subscription.id}")
                    logger.error(f"  Response: {response.text}")

            except Exception as e:
                logger.error(f"Error inesperado enviando notificación: {e}")

        # Eliminar suscripciones expiradas
        if failed_subscriptions:
            await db.execute(
                delete(PushSubscription).where(
                    PushSubscription.id.in_(failed_subscriptions)
                )
            )
            await db.commit()
            logger.info(f"Eliminadas {len(failed_subscriptions)} suscripciones expiradas")

        return {
            "success": sent_count > 0,
            "sent_count": sent_count,
            "total_subscriptions": len(subscriptions),
            "removed_expired": len(failed_subscriptions)
        }

    @staticmethod
    async def save_subscription(
        db: AsyncSession,
        user_id: int,
        endpoint: str,
        p256dh_key: str,
        auth_key: str
    ) -> PushSubscription:
        """
        Guarda o actualiza una suscripción push.
        Si ya existe el mismo endpoint para el usuario, la actualiza.

        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            endpoint: URL del endpoint push
            p256dh_key: Clave pública p256dh
            auth_key: Clave de autenticación

        Returns:
            PushSubscription creada o actualizada
        """
        # Asegurar que user_id sea int
        user_id = int(user_id)

        # Verificar si ya existe
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Actualizar keys (pueden cambiar si el usuario reinstala la PWA)
            existing.p256dh_key = p256dh_key
            existing.auth_key = auth_key
            await db.commit()
            await db.refresh(existing)
            logger.info(f"Subscription actualizada para user {user_id}")
            return existing
        else:
            # Crear nueva
            subscription = PushSubscription(
                user_id=user_id,
                endpoint=endpoint,
                p256dh_key=p256dh_key,
                auth_key=auth_key
            )
            db.add(subscription)
            await db.commit()
            await db.refresh(subscription)
            logger.info(f"Nueva subscription creada para user {user_id}")
            return subscription

    @staticmethod
    async def remove_subscription(
        db: AsyncSession,
        user_id: int,
        endpoint: str
    ) -> bool:
        """
        Elimina una suscripción específica de un usuario.

        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            endpoint: Endpoint a eliminar

        Returns:
            True si se eliminó, False si no existía
        """
        # Asegurar que user_id sea int
        user_id = int(user_id)

        result = await db.execute(
            delete(PushSubscription).where(
                PushSubscription.user_id == user_id,
                PushSubscription.endpoint == endpoint
            )
        )
        await db.commit()

        deleted = result.rowcount > 0
        if deleted:
            logger.info(f"Subscription eliminada para user {user_id}")
        return deleted

    @staticmethod
    async def get_user_subscriptions(
        db: AsyncSession,
        user_id: int
    ) -> List[PushSubscription]:
        """
        Obtiene todas las suscripciones de un usuario.

        Args:
            db: Sesión de base de datos
            user_id: ID del usuario

        Returns:
            Lista de suscripciones
        """
        # Asegurar que user_id sea int
        user_id = int(user_id)

        result = await db.execute(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        )
        return result.scalars().all()
