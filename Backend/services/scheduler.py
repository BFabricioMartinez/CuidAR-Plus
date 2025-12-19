"""
Scheduler para notificaciones programadas de medicación.
Utiliza APScheduler para programar y ejecutar notificaciones en el momento adecuado.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio

from models.push_subscription import PushNotificationPayload
from services.push_service import PushNotificationService
from config.db import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Configuración del scheduler
jobstores = {
    'default': MemoryJobStore()
}
executors = {
    'default': ThreadPoolExecutor(10)
}
job_defaults = {
    'coalesce': False,  # No combinar ejecuciones perdidas
    'max_instances': 3  # Máximo 3 instancias de un job simultáneamente
}

# Inicializar scheduler
scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
    timezone='UTC'
)


def send_medication_notification_sync(user_id: int, medication_name: str, dosage: str, notification_type: str):
    """
    Función sincrónica que envía la notificación.
    APScheduler requiere funciones síncronas, así que wrapeamos la función async.

    Args:
        user_id: ID del usuario (paciente o cuidador)
        medication_name: Nombre del medicamento
        dosage: Dosis del medicamento
        notification_type: Tipo de notificación ('1_hour', '10_min', 'now')
    """
    try:
        # Ejecutar la función async en un nuevo event loop
        asyncio.run(send_medication_notification_async(
            user_id=user_id,
            medication_name=medication_name,
            dosage=dosage,
            notification_type=notification_type
        ))
    except Exception as e:
        logger.error(f"Error en send_medication_notification_sync: {e}")


async def send_medication_notification_async(
    user_id: int,
    medication_name: str,
    dosage: str,
    notification_type: str
):
    """
    Función asíncrona que envía la notificación push.

    Args:
        user_id: ID del usuario (paciente o cuidador)
        medication_name: Nombre del medicamento
        dosage: Dosis del medicamento
        notification_type: Tipo de notificación ('1_hour', '10_min', 'now')
    """
    try:
        # Crear payload según el tipo de notificación
        if notification_type == '1_hour':
            title = "⏰ Recordatorio de medicación"
            body = f"En 1 hora: {medication_name} {dosage}"
            tag = f"medication-1h-{user_id}"
        elif notification_type == '10_min':
            title = "🔔 Medicación próxima"
            body = f"En 10 minutos: {medication_name} {dosage}"
            tag = f"medication-10m-{user_id}"
        else:  # 'now'
            title = "💊 Hora de medicación"
            body = f"Tomar ahora: {medication_name} {dosage}"
            tag = f"medication-now-{user_id}"

        payload = PushNotificationPayload(
            title=title,
            body=body,
            icon="/pwa-192x192.png",
            badge="/pwa-192x192.png",
            tag=tag,
            data={
                "type": "medication_reminder",
                "notification_type": notification_type,
                "medication_name": medication_name,
                "dosage": dosage
            }
        )

        # Enviar notificación
        async with AsyncSessionLocal() as session:
            result = await PushNotificationService.send_to_user(
                db=session,
                user_id=user_id,
                payload=payload
            )

            if result["success"]:
                logger.info(
                    f"Notificación '{notification_type}' enviada a usuario {user_id} "
                    f"para {medication_name} ({result['sent_count']} dispositivos)"
                )
            else:
                logger.warning(
                    f"No se pudo enviar notificación a usuario {user_id}: {result.get('error')}"
                )

    except Exception as e:
        logger.error(f"Error enviando notificación async: {e}")


class MedicationNotificationScheduler:
    """
    Manejador para programar notificaciones de medicación.
    """

    @staticmethod
    def schedule_medication_reminders(
        intake_log_id: int,
        user_id: int,
        medication_name: str,
        dosage: str,
        scheduled_datetime: datetime
    ) -> dict:
        """
        Programa 3 notificaciones para una toma de medicamento:
        1. 1 hora antes
        2. 10 minutos antes
        3. En el momento exacto

        Args:
            intake_log_id: ID del IntakeLog
            user_id: ID del usuario (paciente o cuidador que debe recibir la notificación)
            medication_name: Nombre del medicamento
            dosage: Dosis
            scheduled_datetime: Fecha y hora programada para la toma

        Returns:
            dict con los job_ids programados
        """
        job_ids = {}

        try:
            # Calcular momentos de notificación
            one_hour_before = scheduled_datetime - timedelta(hours=1)
            ten_min_before = scheduled_datetime - timedelta(minutes=10)
            exact_time = scheduled_datetime

            current_time = datetime.utcnow()

            # Programar notificación 1 hora antes (solo si falta más de 1 hora)
            if one_hour_before > current_time:
                job_id_1h = f"medication_{intake_log_id}_1h"
                scheduler.add_job(
                    send_medication_notification_sync,
                    trigger=DateTrigger(run_date=one_hour_before),
                    args=[user_id, medication_name, dosage, '1_hour'],
                    id=job_id_1h,
                    replace_existing=True
                )
                job_ids['1_hour'] = job_id_1h
                logger.info(f"Programada notificación 1h antes: {job_id_1h} para {one_hour_before}")

            # Programar notificación 10 minutos antes (solo si falta más de 10 min)
            if ten_min_before > current_time:
                job_id_10m = f"medication_{intake_log_id}_10m"
                scheduler.add_job(
                    send_medication_notification_sync,
                    trigger=DateTrigger(run_date=ten_min_before),
                    args=[user_id, medication_name, dosage, '10_min'],
                    id=job_id_10m,
                    replace_existing=True
                )
                job_ids['10_min'] = job_id_10m
                logger.info(f"Programada notificación 10min antes: {job_id_10m} para {ten_min_before}")

            # Programar notificación en el momento exacto
            if exact_time > current_time:
                job_id_now = f"medication_{intake_log_id}_now"
                scheduler.add_job(
                    send_medication_notification_sync,
                    trigger=DateTrigger(run_date=exact_time),
                    args=[user_id, medication_name, dosage, 'now'],
                    id=job_id_now,
                    replace_existing=True
                )
                job_ids['now'] = job_id_now
                logger.info(f"Programada notificación en el momento: {job_id_now} para {exact_time}")

            return {
                "success": True,
                "job_ids": job_ids,
                "scheduled_for": scheduled_datetime.isoformat()
            }

        except Exception as e:
            logger.error(f"Error programando notificaciones: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def cancel_medication_reminders(intake_log_id: int) -> bool:
        """
        Cancela todas las notificaciones programadas para un IntakeLog.

        Args:
            intake_log_id: ID del IntakeLog

        Returns:
            True si se canceló al menos un job
        """
        try:
            canceled = 0
            job_ids = [
                f"medication_{intake_log_id}_1h",
                f"medication_{intake_log_id}_10m",
                f"medication_{intake_log_id}_now"
            ]

            for job_id in job_ids:
                try:
                    scheduler.remove_job(job_id)
                    canceled += 1
                    logger.info(f"Job cancelado: {job_id}")
                except Exception:
                    # Job no existe o ya fue ejecutado
                    pass

            return canceled > 0

        except Exception as e:
            logger.error(f"Error cancelando notificaciones: {e}")
            return False

    @staticmethod
    def get_scheduled_jobs() -> list:
        """
        Obtiene todos los jobs programados actualmente.

        Returns:
            Lista de jobs con su información
        """
        jobs = scheduler.get_jobs()
        return [
            {
                "id": job.id,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "name": job.name
            }
            for job in jobs
        ]


def get_scheduler():
    """Retorna la instancia del scheduler"""
    return scheduler


def start_scheduler():
    """Inicia el scheduler si no está corriendo"""
    if not scheduler.running:
        scheduler.start()
        logger.info("✅ Scheduler de notificaciones iniciado")
    else:
        logger.info("ℹ️  Scheduler ya estaba corriendo")


def shutdown_scheduler():
    """Detiene el scheduler de forma segura"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Scheduler de notificaciones detenido")
