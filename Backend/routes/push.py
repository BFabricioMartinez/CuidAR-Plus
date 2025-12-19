from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
import traceback
import logging

from models import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    PushNotificationPayload
)
from models.push_subscription import PushSubscription
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from services.push_service import PushNotificationService

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
        user = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])

        async with AsyncSessionLocal() as session:
            # Guardar suscripción
            subscription = await PushNotificationService.save_subscription(
                db=session,
                user_id=user.id,
                endpoint=subscription_data.subscription.endpoint,
                p256dh_key=subscription_data.subscription.keys.p256dh,
                auth_key=subscription_data.subscription.keys.auth
            )

            logger.info(f"Usuario {user.id} suscrito a push notifications")

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
        user = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])

        async with AsyncSessionLocal() as session:
            # Eliminar suscripción
            deleted = await PushNotificationService.remove_subscription(
                db=session,
                user_id=user.id,
                endpoint=endpoint
            )

            if deleted:
                logger.info(f"Usuario {user.id} desuscrito de push notifications")
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
        user = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])

        async with AsyncSessionLocal() as session:
            subscriptions = await PushNotificationService.get_user_subscriptions(
                db=session,
                user_id=user.id
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
    Enviar una notificación de prueba al usuario autenticado.
    Útil para testing.
    """
    try:
        # Obtener usuario autenticado
        user = require_roles(req, ["ADMIN", "ASISTENCIAL", "PERSONAL"])

        async with AsyncSessionLocal() as session:
            # Crear payload de prueba
            payload = PushNotificationPayload(
                title="🧪 Notificación de prueba",
                body="Si ves esto, las notificaciones push funcionan correctamente!",
                icon="/pwa-192x192.png",
                badge="/pwa-192x192.png",
                tag="test-notification"
            )

            # Enviar notificación
            result = await PushNotificationService.send_to_user(
                db=session,
                user_id=user.id,
                payload=payload
            )

            if result["success"]:
                return JSONResponse(
                    status_code=200,
                    content={
                        "message": "Notificación de prueba enviada",
                        "sent_count": result["sent_count"],
                        "total_subscriptions": result["total_subscriptions"]
                    }
                )
            else:
                return JSONResponse(
                    status_code=400,
                    content={
                        "message": result.get("error", "No se pudo enviar la notificación")
                    }
                )

    except ValueError as e:
        return JSONResponse(status_code=401, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Error en test_push_notification: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al enviar notificación de prueba"}
        )
