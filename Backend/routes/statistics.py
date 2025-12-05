from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from models import User, Patient, Treatment, IntakeLog
from config.db import AsyncSessionLocal
from auth.security import Security
from datetime import datetime, date
import traceback

statistics = APIRouter()


@statistics.get("/statistics/overview")
async def get_overview(req: Request):
    """Obtiene estadísticas generales del sistema."""
    try:
        has_access = Security.verify_token(req.headers)
        if "iat" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Usuarios activos
            stmt_users = select(func.count(User.id)).where(User.active.is_(True))
            result_users = await session.execute(stmt_users)
            active_users = result_users.scalar()

            # Total pacientes
            stmt_patients = select(func.count(Patient.id))
            result_patients = await session.execute(stmt_patients)
            total_patients = result_patients.scalar()

            # Tratamientos activos
            stmt_treatments = select(func.count(Treatment.id)).where(Treatment.active.is_(True))
            result_treatments = await session.execute(stmt_treatments)
            active_treatments = result_treatments.scalar()

            # Dosis de HOY
            today = date.today()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            stmt_taken = (
                select(func.count(IntakeLog.id))
                .where(IntakeLog.taken_at >= today_start)
                .where(IntakeLog.taken_at <= today_end)
                .where(IntakeLog.status == "TAKEN")
            )
            result_taken = await session.execute(stmt_taken)
            taken_today = result_taken.scalar()

            stmt_missed = (
                select(func.count(IntakeLog.id))
                .where(IntakeLog.taken_at >= today_start)
                .where(IntakeLog.taken_at <= today_end)
                .where(IntakeLog.status == "MISSED")
            )
            result_missed = await session.execute(stmt_missed)
            missed_today = result_missed.scalar()

            total_today = taken_today + missed_today
            adherence_today = round((taken_today / total_today * 100), 2) if total_today > 0 else None

            return JSONResponse(
                status_code=200,
                content={
                    "active_users": active_users or 0,
                    "total_patients": total_patients or 0,
                    "active_treatments": active_treatments or 0,
                    "today_doses": {
                        "taken": taken_today or 0,
                        "missed": missed_today or 0,
                        "total": total_today or 0,
                        "adherence_percentage": adherence_today
                    }
                }
            )

    except Exception as error:
        print("Error al obtener estadísticas generales ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener estadísticas"}
        )
