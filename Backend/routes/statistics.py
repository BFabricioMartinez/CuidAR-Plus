from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, and_
from models import User, Patient, Treatment, IntakeLog, Assignment
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from datetime import datetime, date, timedelta
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


# ============================================
# ENDPOINTS ADMIN OPTIMIZADOS
# ============================================

@statistics.get("/statistics/admin/patients-adherence")
async def get_patients_adherence(req: Request):
    """
    Obtiene la adherencia de todos los pacientes en los últimos 7 días.
    Optimiza múltiples llamadas a /intake/patient/{id}/history
    
    Control de acceso: SOLO ADMIN
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            today = date.today()
            seven_days_ago = today - timedelta(days=7)
            today_start = datetime.combine(seven_days_ago, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            # Obtener todos los pacientes
            stmt_patients = select(Patient)
            result_patients = await session.execute(stmt_patients)
            patients = result_patients.scalars().all()

            adherence_data = []

            for patient in patients:
                # Obtener intakes de los últimos 7 días para este paciente
                stmt_intakes = (
                    select(IntakeLog)
                    .join(Treatment)
                    .where(and_(
                        Treatment.patient_id == patient.id,
                        IntakeLog.taken_at >= today_start,
                        IntakeLog.taken_at <= today_end
                    ))
                )
                result_intakes = await session.execute(stmt_intakes)
                intakes = result_intakes.scalars().all()

                # Calcular estadísticas
                taken = sum(1 for i in intakes if str(i.status).upper().strip() == 'TAKEN')
                missed = sum(1 for i in intakes if str(i.status).upper().strip() == 'MISSED')
                total = taken + missed
                adherence_percentage = round((taken / total * 100), 2) if total > 0 else None

                adherence_data.append({
                    "patient_id": patient.id,
                    "patient_name": patient.name,
                    "adherence_percentage": adherence_percentage,
                    "taken": taken,
                    "missed": missed,
                    "total": total
                })

            # Ordenar por adherencia descendente
            adherence_data.sort(
                key=lambda x: x["adherence_percentage"] if x["adherence_percentage"] is not None else -1,
                reverse=True
            )

            return JSONResponse(
                status_code=200,
                content={"patients": adherence_data}
            )

    except Exception as error:
        print("Error calculando adherencia de pacientes ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error calculando adherencia de pacientes"}
        )


@statistics.get("/statistics/admin/adherence-trend")
async def get_adherence_trend(req: Request):
    """
    Obtiene la tendencia de adherencia global agrupada por día (últimos 7 días).
    Optimiza múltiples llamadas a /intake/patient/{id}/history
    
    Control de acceso: SOLO ADMIN
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            today = date.today()
            seven_days_ago = today - timedelta(days=7)
            today_start = datetime.combine(seven_days_ago, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())

            # Inicializar mapa de días
            day_map = {}
            for i in range(7):
                day = today - timedelta(days=6-i)
                day_map[day.isoformat()] = {'taken': 0, 'missed': 0, 'total': 0}

            # Obtener todos los intakes de los últimos 7 días
            stmt_intakes = (
                select(IntakeLog)
                .where(and_(
                    IntakeLog.taken_at >= today_start,
                    IntakeLog.taken_at <= today_end
                ))
            )
            result_intakes = await session.execute(stmt_intakes)
            intakes = result_intakes.scalars().all()

            # Agrupar por día
            for intake in intakes:
                intake_date = intake.taken_at.date()
                date_key = intake_date.isoformat()

                if date_key in day_map:
                    day_map[date_key]['total'] += 1
                    status = str(intake.status).upper().strip()
                    if status == 'TAKEN':
                        day_map[date_key]['taken'] += 1
                    elif status == 'MISSED':
                        day_map[date_key]['missed'] += 1

            # Convertir a lista ordenada
            trend_data = []
            for i in range(7):
                day = today - timedelta(days=6-i)
                date_key = day.isoformat()
                stats = day_map[date_key]
                adherence_percentage = round((stats['taken'] / stats['total'] * 100), 2) if stats['total'] > 0 else 0.0

                trend_data.append({
                    "date": date_key,
                    "taken": stats['taken'],
                    "missed": stats['missed'],
                    "total": stats['total'],
                    "adherence_percentage": adherence_percentage
                })

            return JSONResponse(
                status_code=200,
                content={"trend": trend_data}
            )

    except Exception as error:
        print("Error calculando tendencia de adherencia ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error calculando tendencia de adherencia"}
        )


@statistics.get("/statistics/admin/caregiver-stats")
async def get_caregiver_stats(req: Request):
    """
    Obtiene estadísticas de cuidadores (cantidad de pacientes asignados).
    Optimiza múltiples llamadas a /user/{id} y /assignment/paginated
    
    Control de acceso: SOLO ADMIN
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            # Obtener todas las asignaciones activas
            stmt_assignments = select(Assignment).where(Assignment.active.is_(True))
            result_assignments = await session.execute(stmt_assignments)
            assignments = result_assignments.scalars().all()

            # Agrupar por cuidador
            caregiver_map = {}
            for assignment in assignments:
                caregiver_id = assignment.caregiver_id
                if caregiver_id not in caregiver_map:
                    # Obtener nombre del cuidador
                    stmt_user = select(User).where(User.id == caregiver_id)
                    result_user = await session.execute(stmt_user)
                    caregiver = result_user.scalar_one_or_none()
                    
                    caregiver_name = 'Desconocido'
                    if caregiver:
                        caregiver_name = caregiver.name if caregiver.name else (
                            caregiver.email.split('@')[0] if caregiver.email else 'Desconocido'
                        )
                    
                    caregiver_map[caregiver_id] = {
                        'name': caregiver_name,
                        'count': 0
                    }
                caregiver_map[caregiver_id]['count'] += 1

            # Convertir a lista ordenada
            caregivers = [
                {
                    "caregiver_id": caregiver_id,
                    "caregiver_name": data['name'],
                    "patient_count": data['count']
                }
                for caregiver_id, data in sorted(caregiver_map.items(), key=lambda x: x[1]['count'], reverse=True)
            ]

            return JSONResponse(
                status_code=200,
                content={"caregivers": caregivers}
            )

    except Exception as error:
        print("Error calculando estadísticas de cuidadores ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error calculando estadísticas de cuidadores"}
        )


