from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from models import User, Patient, Treatment, IntakeLog, Assignment
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
        if "sub" not in has_access:
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


@statistics.get("/statistics/my-stats")
async def get_my_stats(req: Request, user_id: int):
    """
    Obtiene estadísticas específicas de un cuidador (ASISTENCIAL).

    Retorna:
    - assigned_patients: Cantidad de pacientes asignados al cuidador
    - today_doses: Dosis de hoy (taken, missed, total, adherence_percentage)
    """
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Obtener cantidad de pacientes asignados al cuidador
            stmt_assignments = (
                select(func.count(Assignment.id))
                .where(Assignment.caregiver_id == user_id)
                .where(Assignment.active.is_(True))
            )
            result_assignments = await session.execute(stmt_assignments)
            assigned_patients = result_assignments.scalar()

            # Obtener IDs de pacientes asignados
            stmt_patient_ids = (
                select(Assignment.patient_id)
                .where(Assignment.caregiver_id == user_id)
                .where(Assignment.active.is_(True))
            )
            result_patient_ids = await session.execute(stmt_patient_ids)
            patient_ids = [row[0] for row in result_patient_ids.fetchall()]

            # Dosis de HOY de los pacientes asignados
            today = date.today()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            if len(patient_ids) > 0:
                # Obtener tratamientos de los pacientes asignados
                stmt_treatment_ids = (
                    select(Treatment.id)
                    .where(Treatment.patient_id.in_(patient_ids))
                    .where(Treatment.active.is_(True))
                )
                result_treatment_ids = await session.execute(stmt_treatment_ids)
                treatment_ids = [row[0] for row in result_treatment_ids.fetchall()]

                if len(treatment_ids) > 0:
                    # Dosis tomadas hoy
                    stmt_taken = (
                        select(func.count(IntakeLog.id))
                        .where(IntakeLog.treatment_id.in_(treatment_ids))
                        .where(IntakeLog.taken_at >= today_start)
                        .where(IntakeLog.taken_at <= today_end)
                        .where(IntakeLog.status == "TAKEN")
                    )
                    result_taken = await session.execute(stmt_taken)
                    taken_today = result_taken.scalar()

                    # Dosis omitidas hoy
                    stmt_missed = (
                        select(func.count(IntakeLog.id))
                        .where(IntakeLog.treatment_id.in_(treatment_ids))
                        .where(IntakeLog.taken_at >= today_start)
                        .where(IntakeLog.taken_at <= today_end)
                        .where(IntakeLog.status == "MISSED")
                    )
                    result_missed = await session.execute(stmt_missed)
                    missed_today = result_missed.scalar()
                else:
                    taken_today = 0
                    missed_today = 0
            else:
                taken_today = 0
                missed_today = 0

            total_today = taken_today + missed_today
            adherence_today = round((taken_today / total_today * 100), 2) if total_today > 0 else None

            return JSONResponse(
                status_code=200,
                content={
                    "assigned_patients": assigned_patients or 0,
                    "today_doses": {
                        "taken": taken_today or 0,
                        "missed": missed_today or 0,
                        "total": total_today or 0,
                        "adherence_percentage": adherence_today
                    }
                }
            )

    except Exception as error:
        print("Error al obtener estadísticas del cuidador ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener estadísticas del cuidador"}
        )


@statistics.get("/statistics/personal-stats")
async def get_personal_stats(req: Request, user_id: int):
    """
    Obtiene estadísticas específicas de un usuario PERSONAL.

    Retorna:
    - today_doses: Dosis de hoy (taken, missed, total, adherence_percentage)
    """
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Para PERSONAL: obtener paciente donde caregiver_id = user_id
            stmt_patients = (
                select(Patient.id)
                .where(Patient.caregiver_id == user_id)
                .where(Patient.active.is_(True))
            )
            result_patients = await session.execute(stmt_patients)
            patient_ids = [row[0] for row in result_patients.fetchall()]

            # Dosis de HOY del paciente
            today = date.today()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            if len(patient_ids) > 0:
                # Obtener tratamientos del paciente
                stmt_treatment_ids = (
                    select(Treatment.id)
                    .where(Treatment.patient_id.in_(patient_ids))
                    .where(Treatment.active.is_(True))
                )
                result_treatment_ids = await session.execute(stmt_treatment_ids)
                treatment_ids = [row[0] for row in result_treatment_ids.fetchall()]

                if len(treatment_ids) > 0:
                    # Dosis tomadas hoy
                    stmt_taken = (
                        select(func.count(IntakeLog.id))
                        .where(IntakeLog.treatment_id.in_(treatment_ids))
                        .where(IntakeLog.taken_at >= today_start)
                        .where(IntakeLog.taken_at <= today_end)
                        .where(IntakeLog.status == "TAKEN")
                    )
                    result_taken = await session.execute(stmt_taken)
                    taken_today = result_taken.scalar()

                    # Dosis omitidas hoy
                    stmt_missed = (
                        select(func.count(IntakeLog.id))
                        .where(IntakeLog.treatment_id.in_(treatment_ids))
                        .where(IntakeLog.taken_at >= today_start)
                        .where(IntakeLog.taken_at <= today_end)
                        .where(IntakeLog.status == "MISSED")
                    )
                    result_missed = await session.execute(stmt_missed)
                    missed_today = result_missed.scalar()
                else:
                    taken_today = 0
                    missed_today = 0
            else:
                taken_today = 0
                missed_today = 0

            total_today = taken_today + missed_today
            adherence_today = round((taken_today / total_today * 100), 2) if total_today > 0 else None

            return JSONResponse(
                status_code=200,
                content={
                    "today_doses": {
                        "taken": taken_today or 0,
                        "missed": missed_today or 0,
                        "total": total_today or 0,
                        "adherence_percentage": adherence_today
                    }
                }
            )

    except Exception as error:
        print("Error al obtener estadísticas del usuario PERSONAL ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener estadísticas del usuario PERSONAL"}
        )
