from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
import traceback
import logging
from datetime import datetime, timedelta

from models import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    PushNotificationPayload
)
from models.push_subscription import PushSubscription
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from services.push_service import PushNotificationService
from services.scheduler import get_scheduler

logger = logging.getLogger(__name__)

push = APIRouter(prefix="/push", tags=["Push Notifications"])


@push.post("/subscribe")
async def subscribe_to_push(req: Request, subscription_data: PushSubscriptionCreate):
    """
    Suscribir un dispositivo a notificaciones push.
    Requiere autenticación.
    """
    try:
        # Obtener usuario autenticado
        user_payload = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])

        # Verificar si hubo error de autenticación
        if isinstance(user_payload, JSONResponse):
            return user_payload

        async with AsyncSessionLocal() as session:
            # Guardar suscripción
            subscription = await PushNotificationService.save_subscription(
                db=session,
                user_id=user_payload["sub"],
                endpoint=subscription_data.subscription.endpoint,
                p256dh_key=subscription_data.subscription.keys.p256dh,
                auth_key=subscription_data.subscription.keys.auth
            )

            logger.info(f"Usuario {user_payload['sub']} suscrito a push notifications")

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Suscripción creada exitosamente",
                    "subscription_id": subscription.id
                }
            )

    except ValueError as e:
        return JSONResponse(status_code=401, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Error en subscribe_to_push: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al guardar suscripción"}
        )


@push.delete("/unsubscribe")
async def unsubscribe_from_push(req: Request, endpoint: str):
    """
    Desuscribir un dispositivo de notificaciones push.
    Requiere autenticación.
    """
    try:
        # Obtener usuario autenticado
        user_payload = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(user_payload, JSONResponse):
            return user_payload

        async with AsyncSessionLocal() as session:
            # Eliminar suscripción
            deleted = await PushNotificationService.remove_subscription(
                db=session,
                user_id=user_payload["sub"],
                endpoint=endpoint
            )

            if deleted:
                logger.info(f"Usuario {user_payload['sub']} desuscrito de push notifications")
                return JSONResponse(
                    status_code=200,
                    content={"message": "Suscripción eliminada exitosamente"}
                )
            else:
                return JSONResponse(
                    status_code=404,
                    content={"message": "Suscripción no encontrada"}
                )

    except ValueError as e:
        return JSONResponse(status_code=401, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Error en unsubscribe_from_push: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al eliminar suscripción"}
        )


@push.get("/subscriptions")
async def get_my_subscriptions(req: Request):
    """
    Obtener todas las suscripciones del usuario autenticado.
    """
    try:
        # Obtener usuario autenticado
        user_payload = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(user_payload, JSONResponse):
            return user_payload

        async with AsyncSessionLocal() as session:
            subscriptions = await PushNotificationService.get_user_subscriptions(
                db=session,
                user_id=user_payload["sub"]
            )

            return JSONResponse(
                status_code=200,
                content={
                    "subscriptions": [
                        {
                            "id": sub.id,
                            "endpoint": sub.endpoint,
                            "created_at": sub.created_at.isoformat()
                        }
                        for sub in subscriptions
                    ]
                }
            )

    except ValueError as e:
        return JSONResponse(status_code=401, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Error en get_my_subscriptions: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener suscripciones"}
        )


@push.post("/test")
async def test_push_notification(req: Request):
    """
    Programar una notificación de prueba para 2 minutos después.
    Útil para testing de notificaciones con app cerrada.
    """
    try:
        # Obtener usuario autenticado
        user_payload = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(user_payload, JSONResponse):
            return user_payload

        user_id = user_payload["sub"]

        # Calcular tiempo de envío (2 minutos desde ahora)
        send_time = datetime.now() + timedelta(minutes=2)

        # Crear payload de prueba
        payload = PushNotificationPayload(
            title="🧪 Notificación de prueba",
            body="Si ves esto, las notificaciones push funcionan correctamente!",
            icon="/pwa-192x192.png",
            badge="/pwa-192x192.png",
            tag="test-notification"
        )

        # Programar notificación usando el scheduler
        scheduler = get_scheduler()

        def send_test_notification():
            """Función que se ejecutará en 2 minutos"""
            import asyncio
            from config.db import AsyncSessionLocal

            async def _send():
                async with AsyncSessionLocal() as session:
                    await PushNotificationService.send_to_user(
                        db=session,
                        user_id=user_id,
                        payload=payload
                    )

            # Ejecutar la función async en el event loop
            asyncio.run(_send())

        # Programar el job
        job = scheduler.add_job(
            send_test_notification,
            'date',
            run_date=send_time,
            id=f'test_notification_{user_id}_{int(send_time.timestamp())}',
            replace_existing=True
        )

        logger.info(f"Notificación de prueba programada para {send_time.strftime('%H:%M:%S')} (usuario {user_id})")

        return JSONResponse(
            status_code=200,
            content={
                "message": f"Notificación de prueba programada para 2 minutos (aproximadamente a las {send_time.strftime('%H:%M:%S')})",
                "scheduled_time": send_time.isoformat(),
                "job_id": job.id
            }
        )

    except ValueError as e:
        return JSONResponse(status_code=401, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Error en test_push_notification: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al programar notificación de prueba"}
        )
