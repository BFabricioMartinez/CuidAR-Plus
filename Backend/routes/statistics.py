from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from models import User, Patient, Treatment, IntakeLog, Assignment
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from datetime import datetime, date
import traceback

statistics = APIRouter()


@statistics.get("/statistics/overview")
async def get_overview(req: Request):
    """
    Obtiene estadísticas generales del sistema.

    Control de acceso por rol:
    - ADMIN: acceso total a estadísticas del sistema
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

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
    Obtiene estadísticas específicas de un usuario (ASISTENCIAL o PERSONAL).

    Control de acceso por rol:
    - ADMIN: puede ver estadísticas de cualquier usuario
    - ASISTENCIAL: solo puede ver sus propias estadísticas (user_id debe coincidir con token.sub)
    - PERSONAL: solo puede ver sus propias estadísticas (user_id debe coincidir con token.sub)

    Retorna:
    - assigned_patients: Cantidad de pacientes asignados (solo para ASISTENCIAL, 0 para PERSONAL)
    - today_doses: Dosis de hoy (taken, missed, total, adherence_percentage)
    """
    try:
        # Verificar token y rol (ADMIN, ASISTENCIAL, PERSONAL)
        payload = require_roles(req.headers, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(payload, JSONResponse):
            return payload

        token_user_id = int(payload["sub"])
        user_role = payload["role"].upper()

        # ============================================================================
        # VALIDACIÓN DE ACCESO POR ROL
        # ============================================================================
        if user_role in ["ASISTENCIAL", "PERSONAL"]:
            # ASISTENCIAL y PERSONAL: solo pueden ver sus propias estadísticas
            if user_id != token_user_id:
                return JSONResponse(status_code=403, content={"message": "Acceso denegado"})
        # ADMIN: sin validaciones adicionales (puede ver estadísticas de cualquier usuario)

        async with AsyncSessionLocal() as session:
            # Determinar el rol del usuario consultado (para ADMIN que puede ver otros usuarios)
            # Si es ADMIN consultando otro usuario, necesitamos determinar su rol
            consulted_user_role = user_role
            if user_role == "ADMIN" and user_id != token_user_id:
                # ADMIN consultando otro usuario: determinar su rol
                stmt_user = select(User.role).where(User.id == user_id)
                result_user = await session.execute(stmt_user)
                consulted_user_role_db = result_user.scalar_one_or_none()
                if consulted_user_role_db:
                    consulted_user_role = consulted_user_role_db.upper()
                else:
                    return JSONResponse(
                        status_code=404,
                        content={"message": "Usuario no encontrado"}
                    )
            elif user_role == "ADMIN" and user_id == token_user_id:
                # ADMIN consultando sus propias estadísticas: retornar datos vacíos
                # (ADMIN no tiene pacientes asignados ni dosis personales)
                return JSONResponse(
                    status_code=200,
                    content={
                        "assigned_patients": 0,
                        "today_doses": {
                            "taken": 0,
                            "missed": 0,
                            "total": 0,
                            "adherence_percentage": None
                        }
                    }
                )

            # ============================================================================
            # LÓGICA SEGÚN ROL DEL USUARIO CONSULTADO
            # ============================================================================
            if consulted_user_role == "ASISTENCIAL":
                # ASISTENCIAL: obtener pacientes asignados vía Assignment
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

            elif consulted_user_role == "PERSONAL":
                # PERSONAL: obtener paciente donde caregiver_id = user_id
                assigned_patients = 0  # PERSONAL no tiene pacientes asignados, solo su propio paciente
                stmt_patient_ids = (
                    select(Patient.id)
                    .where(Patient.caregiver_id == user_id)
                    .where(Patient.active.is_(True))
                )
                result_patient_ids = await session.execute(stmt_patient_ids)
                patient_ids = [row[0] for row in result_patient_ids.fetchall()]

            else:
                # ADMIN u otro rol consultado por ADMIN: retornar datos vacíos
                return JSONResponse(
                    status_code=200,
                    content={
                        "assigned_patients": 0,
                        "today_doses": {
                            "taken": 0,
                            "missed": 0,
                            "total": 0,
                            "adherence_percentage": None
                        }
                    }
                )

            # Dosis de HOY de los pacientes
            today = date.today()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            if len(patient_ids) > 0:
                # Obtener tratamientos de los pacientes
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

    Control de acceso por rol:
    - PERSONAL: solo puede ver sus propias estadísticas (user_id debe coincidir con token.sub)

    Retorna:
    - today_doses: Dosis de hoy (taken, missed, total, adherence_percentage)
    """
    try:
        # Verificar token y rol (SOLO PERSONAL)
        payload = require_roles(req.headers, ["PERSONAL"])
        if isinstance(payload, JSONResponse):
            return payload

        token_user_id = int(payload["sub"])

        # Validar que el user_id solicitado coincida con el token
        if user_id != token_user_id:
            return JSONResponse(status_code=403, content={"message": "Acceso denegado"})

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
