from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from models import IntakeLog, Treatment, Patient, InputIntakeLog, InputIntakeLogUpdate, InputPaginatedRequestFilter
from config.db import AsyncSessionLocal
from auth.security import Security
from utils.update import is_valid_change
import traceback

intake = APIRouter()


@intake.post("/intake/paginated")
async def get_intakes_paginated(req: Request, body: InputPaginatedRequestFilter):
    """
    Obtiene una lista paginada de registros de toma con filtros dinámicos.

    Filtros disponibles en body.filters:
    - treatment_id: Filtro por ID del tratamiento
    - patient_id: Filtro por ID del paciente
    - status: Filtro por estado (tomada, omitida, etc.)
    - order: "desc" para descendente, "asc" para ascendente

    Returns:
        JSONResponse con lista de registros de toma y cursor para siguiente página
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        # Extraer parámetros
        limit = body.limit or 20
        last_seen_id = body.last_seen_id
        filters = body.filters or {}
        order_raw = (filters.get("order") or "").lower()

        # Determinar orden
        order_desc = order_raw in ("desc", "newest", "mas_nuevos")

        async with AsyncSessionLocal() as session:
            # Construir query base
            stmt = (
                select(IntakeLog)
                .options(joinedload(IntakeLog.treatment).joinedload(Treatment.patient))
            )

            # Filtro por treatment_id
            treatment_id_filter = filters.get("treatment_id")
            if treatment_id_filter:
                stmt = stmt.where(IntakeLog.treatment_id == treatment_id_filter)

            # Filtro por patient_id (requiere join)
            patient_id_filter = filters.get("patient_id")
            if patient_id_filter:
                stmt = stmt.join(Treatment, IntakeLog.treatment_id == Treatment.id)
                stmt = stmt.where(Treatment.patient_id == patient_id_filter)

            # Filtro por status
            status_filter = filters.get("status")
            if status_filter:
                stmt = stmt.where(IntakeLog.status.ilike(f"%{status_filter}%"))

            # Aplicar orden
            if order_desc:
                stmt = stmt.order_by(IntakeLog.id.desc())
            else:
                stmt = stmt.order_by(IntakeLog.id.asc())

            # Keyset pagination
            if last_seen_id is not None:
                if order_desc:
                    stmt = stmt.where(IntakeLog.id < last_seen_id)
                else:
                    stmt = stmt.where(IntakeLog.id > last_seen_id)

            # Aplicar límite
            stmt = stmt.limit(limit)

            # Ejecutar query
            result = await session.execute(stmt)
            intakes = result.scalars().all()

            # Serializar
            data = []
            for i in intakes:
                treatment = i.treatment
                patient = treatment.patient if treatment else None

                data.append({
                    "id": i.id,
                    "treatment_id": i.treatment_id,
                    "taken_at": i.taken_at.isoformat() if i.taken_at else None,
                    "scheduled_time": i.scheduled_time,  # Hora programada
                    "status": i.status,
                    "treatment": {
                        "id": treatment.id if treatment else None,
                        "medication_name": treatment.medication_name if treatment else None,
                        "dosage": treatment.dosage if treatment else None,
                        "frequency": treatment.frequency if treatment else None,
                        "patient_id": treatment.patient_id if treatment else None
                    } if treatment else None,
                    "patient": {
                        "id": patient.id if patient else None,
                        "name": patient.name if patient else None
                    } if patient else None
                })

            # Cursor para siguiente página
            next_cursor = intakes[-1].id if len(intakes) == limit else None

            return JSONResponse(
                status_code=200,
                content={"intakes": data, "next_cursor": next_cursor}
            )

    except Exception as error:
        print("Error al obtener registros de toma paginados ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener registros de toma"}
        )


@intake.get("/intake/{intake_id}")
async def get_intake_by_id(req: Request, intake_id: int):
    """
    Obtiene un registro de toma por su ID.

    Args:
        intake_id: ID del registro de toma

    Returns:
        JSONResponse con los datos del registro de toma
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = (
                select(IntakeLog)
                .options(joinedload(IntakeLog.treatment).joinedload(Treatment.patient))
                .where(IntakeLog.id == intake_id)
            )

            result = await session.execute(stmt)
            intake_found = result.scalar_one_or_none()

            if not intake_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Registro de toma con ID {intake_id} no encontrado"}
                )

            treatment = intake_found.treatment
            patient = treatment.patient if treatment else None

            intake_data = {
                "id": intake_found.id,
                "treatment_id": intake_found.treatment_id,
                "taken_at": intake_found.taken_at.isoformat() if intake_found.taken_at else None,
                "scheduled_time": intake_found.scheduled_time,  # Hora programada
                "status": intake_found.status,
                "treatment": {
                    "id": treatment.id if treatment else None,
                    "medication_name": treatment.medication_name if treatment else None,
                    "dosage": treatment.dosage if treatment else None,
                    "frequency": treatment.frequency if treatment else None,
                    "description": treatment.description if treatment else None,
                    "patient_id": treatment.patient_id if treatment else None
                } if treatment else None,
                "patient": {
                    "id": patient.id if patient else None,
                    "name": patient.name if patient else None,
                    "caregiver_id": patient.caregiver_id if patient else None
                } if patient else None
            }

            return JSONResponse(status_code=200, content=intake_data)

    except Exception as error:
        print("Error al obtener registro de toma ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener registro de toma"}
        )


@intake.post("/intake/create")
async def create_intake(req: Request, data: InputIntakeLog):
    """
    Crea un nuevo registro de toma de medicamento.

    Args:
        data: Datos del registro de toma (InputIntakeLog)

    Returns:
        JSONResponse con el registro de toma creado
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el tratamiento existe
            stmt_treatment = select(Treatment).where(Treatment.id == data.treatment_id)
            result_treatment = await session.execute(stmt_treatment)
            treatment = result_treatment.scalar_one_or_none()

            if not treatment:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {data.treatment_id} no encontrado"}
                )

            # ============================================================================
            # FIX: Parsear taken_at de string a datetime naive para PostgreSQL
            #
            # PROBLEMA:
            # - Pydantic convierte automáticamente strings ISO a datetime con timezone UTC
            # - PostgreSQL TIMESTAMP WITHOUT TIME ZONE no acepta datetime con timezone
            #
            # SOLUCIÓN:
            # - Cambiar InputIntakeLog.taken_at de datetime a str
            # - Parsear manualmente el string a datetime naive (sin timezone)
            # ============================================================================
            from datetime import datetime

            # Parsear taken_at de string a datetime naive
            try:
                taken_at_dt = datetime.strptime(data.taken_at, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Si falla, intentar con formato ISO
                taken_at_dt = datetime.fromisoformat(data.taken_at.replace('Z', '+00:00')).replace(tzinfo=None)

            # Crear registro de toma
            new_intake = IntakeLog(
                treatment_id=data.treatment_id,
                taken_at=taken_at_dt,
                status=data.status
            )

            session.add(new_intake)
            await session.commit()
            await session.refresh(new_intake)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Registro de toma creado correctamente",
                    "intake": {
                        "id": new_intake.id,
                        "treatment_id": new_intake.treatment_id,
                        "taken_at": new_intake.taken_at.isoformat() if new_intake.taken_at else None,
                        "status": new_intake.status
                    }
                }
            )

    except Exception as error:
        print("Error al crear registro de toma ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al crear registro de toma"}
        )


@intake.put("/intake/update")
async def update_intake(req: Request, data: InputIntakeLogUpdate):
    """
    Actualiza un registro de toma existente.

    Args:
        data: Datos a actualizar (InputIntakeLogUpdate)

    Returns:
        JSONResponse con mensaje de actualización
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Buscar registro de toma
            stmt = select(IntakeLog).where(IntakeLog.id == data.id)
            result = await session.execute(stmt)
            intake_found = result.scalar_one_or_none()

            if not intake_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Registro de toma con ID {data.id} no encontrado"}
                )

            updated = False

            # Validar y aplicar cambios
            if is_valid_change(data.treatment_id, intake_found.treatment_id):
                # Verificar que el nuevo tratamiento existe
                stmt_treatment = select(Treatment).where(Treatment.id == data.treatment_id)
                result_treatment = await session.execute(stmt_treatment)
                treatment = result_treatment.scalar_one_or_none()

                if not treatment:
                    return JSONResponse(
                        status_code=404,
                        content={"message": f"Tratamiento con ID {data.treatment_id} no encontrado"}
                    )

                intake_found.treatment_id = data.treatment_id
                updated = True

            if is_valid_change(data.taken_at, intake_found.taken_at):
                # Parsear taken_at de string a datetime naive (igual que en create)
                from datetime import datetime
                try:
                    taken_at_dt = datetime.strptime(data.taken_at, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    taken_at_dt = datetime.fromisoformat(data.taken_at.replace('Z', '+00:00')).replace(tzinfo=None)

                intake_found.taken_at = taken_at_dt
                updated = True

            if is_valid_change(data.status, intake_found.status):
                intake_found.status = data.status
                updated = True

            if updated:
                await session.commit()
                return JSONResponse(
                    status_code=200,
                    content={"message": "Registro de toma actualizado correctamente"}
                )
            else:
                return JSONResponse(
                    status_code=200,
                    content={"message": "No se realizaron cambios"}
                )

    except Exception as error:
        print("Error al actualizar registro de toma ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al actualizar registro de toma"}
        )


@intake.get("/intake/treatment/{treatment_id}")
async def get_intakes_by_treatment(req: Request, treatment_id: int):
    """
    Obtiene todos los registros de toma de un tratamiento específico.

    Args:
        treatment_id: ID del tratamiento

    Returns:
        JSONResponse con lista de registros de toma del tratamiento
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el tratamiento existe
            stmt_treatment = select(Treatment).where(Treatment.id == treatment_id)
            result_treatment = await session.execute(stmt_treatment)
            treatment = result_treatment.scalar_one_or_none()

            if not treatment:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {treatment_id} no encontrado"}
                )

            # Obtener registros de toma del tratamiento
            stmt = (
                select(IntakeLog)
                .where(IntakeLog.treatment_id == treatment_id)
                .order_by(IntakeLog.taken_at.desc())
            )

            result = await session.execute(stmt)
            intakes = result.scalars().all()

            # Serializar
            data = []
            for i in intakes:
                data.append({
                    "id": i.id,
                    "treatment_id": i.treatment_id,
                    "taken_at": i.taken_at.isoformat() if i.taken_at else None,
                    "scheduled_time": i.scheduled_time,  # Hora programada
                    "status": i.status
                })

            return JSONResponse(
                status_code=200,
                content={"intakes": data, "count": len(data)}
            )

    except Exception as error:
        print("Error al obtener registros de toma del tratamiento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener registros de toma del tratamiento"}
        )


@intake.get("/intake/patient/{patient_id}/history")
async def get_intakes_by_patient(req: Request, patient_id: int):
    """
    Obtiene el historial completo de tomas de un paciente.

    Args:
        patient_id: ID del paciente

    Returns:
        JSONResponse con historial de tomas del paciente
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el paciente existe
            stmt_patient = select(Patient).where(Patient.id == patient_id)
            result_patient = await session.execute(stmt_patient)
            patient = result_patient.scalar_one_or_none()

            if not patient:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Paciente con ID {patient_id} no encontrado"}
                )

            # Obtener registros de toma del paciente a través de treatments
            stmt = (
                select(IntakeLog)
                .join(Treatment, IntakeLog.treatment_id == Treatment.id)
                .options(joinedload(IntakeLog.treatment))
                .where(Treatment.patient_id == patient_id)
                .order_by(IntakeLog.taken_at.desc())
            )

            result = await session.execute(stmt)
            intakes = result.scalars().all()

            # Serializar
            data = []
            for i in intakes:
                treatment = i.treatment

                data.append({
                    "id": i.id,
                    "treatment_id": i.treatment_id,
                    "taken_at": i.taken_at.isoformat() if i.taken_at else None,
                    "scheduled_time": i.scheduled_time,  # Hora programada
                    "status": i.status,
                    "treatment": {
                        "id": treatment.id if treatment else None,
                        "medication_name": treatment.medication_name if treatment else None,
                        "dosage": treatment.dosage if treatment else None,
                        "frequency": treatment.frequency if treatment else None
                    } if treatment else None
                })

            return JSONResponse(
                status_code=200,
                content={"intakes": data, "count": len(data), "patient_id": patient_id}
            )

    except Exception as error:
        print("Error al obtener historial de tomas del paciente ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener historial de tomas del paciente"}
        )


@intake.post("/tomas/marcar-tomada")
async def marcar_tomada(req: Request, treatment_id: int, time: str, recorded_by_user_id: int, taken_at_full: str = None):
    """
    Marca una dosis como TOMADA creando un registro en IntakeLog.

    Puede ser usado por:
    - Usuario PERSONAL: para marcar sus propias dosis
    - Usuario ASISTENCIAL: para marcar dosis de pacientes asignados (ej: hogar de ancianos)

    Args:
        treatment_id: ID del tratamiento
        time: Hora de la dosis en formato HH:MM (usado si no se provee taken_at_full)
        recorded_by_user_id: ID del usuario que registra la toma (quien marca, no el paciente)
        taken_at_full: (Opcional) Fecha y hora completa en formato "YYYY-MM-DD HH:MM:SS" desde el cliente

    Returns:
        JSONResponse con mensaje de confirmación
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el tratamiento existe
            stmt_treatment = select(Treatment).where(Treatment.id == treatment_id)
            result_treatment = await session.execute(stmt_treatment)
            treatment = result_treatment.scalar_one_or_none()

            if not treatment:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {treatment_id} no encontrado"}
                )

            # ============================================================================
            # FIX: taken_at debe ser la hora ACTUAL cuando se marca la dosis, no la hora programada
            # 
            # PROBLEMA ANTERIOR:
            # - taken_at se guardaba con la hora programada (parámetro 'time')
            # - No había forma de distinguir entre hora programada y hora registrada
            #
            # SOLUCIÓN:
            # - scheduled_time: hora programada de la dosis (parámetro 'time', ej: "08:00")
            # - taken_at: hora exacta cuando el usuario marca la dosis (taken_at_full del cliente)
            # ============================================================================
            from datetime import datetime, date

            # # CÓDIGO ANTERIOR (COMENTADO):
            # # if taken_at_full:
            # #     # Parsear fecha completa enviada por el cliente (zona horaria del cliente)
            # #     try:
            # #         taken_at_dt = datetime.strptime(taken_at_full, "%Y-%m-%d %H:%M:%S")
            # #     except ValueError:
            # #         # Intentar con formato ISO si falla
            # #         taken_at_dt = datetime.fromisoformat(taken_at_full.replace('Z', '+00:00')).replace(tzinfo=None)
            # # else:
            # #     # Fallback: usar fecha del servidor (comportamiento original)
            # #     today = date.today()
            # #     hour, minute = map(int, time.split(':'))
            # #     taken_at_dt = datetime(today.year, today.month, today.day, hour, minute, 0)
            # # new_intake = IntakeLog(
            # #     treatment_id=treatment_id,
            # #     taken_at=taken_at_dt,
            # #     status="TAKEN"
            # # )

            # NUEVO CÓDIGO:
            # taken_at debe ser la hora ACTUAL cuando se marca la dosis
            if taken_at_full:
                # Parsear fecha completa enviada por el cliente (hora actual del cliente)
                try:
                    taken_at_dt = datetime.strptime(taken_at_full, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    # Intentar con formato ISO si falla
                    taken_at_dt = datetime.fromisoformat(taken_at_full.replace('Z', '+00:00')).replace(tzinfo=None)
            else:
                # Fallback: usar hora actual del servidor si no se provee taken_at_full
                taken_at_dt = datetime.now()

            # Crear registro de toma
            # scheduled_time: hora programada (parámetro 'time', ej: "08:00")
            # taken_at: hora exacta cuando se marca la dosis (taken_at_full)
            new_intake = IntakeLog(
                treatment_id=treatment_id,
                taken_at=taken_at_dt,  # Hora actual cuando se marca la dosis
                scheduled_time=time,  # Hora programada de la dosis
                status="TAKEN"
            )

            session.add(new_intake)
            await session.commit()
            await session.refresh(new_intake)

            return JSONResponse(
                status_code=201,
                content={
                    "message": f"Dosis de las {time} marcada como tomada correctamente",
                    "data": {
                        "id": new_intake.id,
                        "treatment_id": new_intake.treatment_id,
                        "taken_at": new_intake.taken_at.isoformat() if new_intake.taken_at else None,
                        "scheduled_time": new_intake.scheduled_time,  # Hora programada
                        "status": new_intake.status
                    }
                }
            )

    except Exception as error:
        print("Error al marcar dosis como tomada ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al marcar dosis como tomada"}
        )


@intake.post("/tomas/marcar-omitida")
async def marcar_omitida(req: Request, treatment_id: int, time: str, recorded_by_user_id: int, taken_at_full: str = None):
    """
    Marca una dosis como OMITIDA creando un registro en IntakeLog.

    Puede ser usado por:
    - Usuario PERSONAL: para marcar sus propias dosis omitidas
    - Usuario ASISTENCIAL: para marcar dosis omitidas de pacientes asignados (ej: hogar de ancianos)

    Args:
        treatment_id: ID del tratamiento
        time: Hora de la dosis en formato HH:MM (usado si no se provee taken_at_full)
        recorded_by_user_id: ID del usuario que registra la omisión (quien marca, no el paciente)
        taken_at_full: (Opcional) Fecha y hora completa en formato "YYYY-MM-DD HH:MM:SS" desde el cliente

    Returns:
        JSONResponse con mensaje de confirmación
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el tratamiento existe
            stmt_treatment = select(Treatment).where(Treatment.id == treatment_id)
            result_treatment = await session.execute(stmt_treatment)
            treatment = result_treatment.scalar_one_or_none()

            if not treatment:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {treatment_id} no encontrado"}
                )

            # ============================================================================
            # FIX: taken_at debe ser la hora ACTUAL cuando se marca la dosis, no la hora programada
            # 
            # PROBLEMA ANTERIOR:
            # - taken_at se guardaba con la hora programada (parámetro 'time')
            # - No había forma de distinguir entre hora programada y hora registrada
            #
            # SOLUCIÓN:
            # - scheduled_time: hora programada de la dosis (parámetro 'time', ej: "08:00")
            # - taken_at: hora exacta cuando el usuario marca la dosis (taken_at_full del cliente)
            # ============================================================================
            from datetime import datetime, date

            # # CÓDIGO ANTERIOR (COMENTADO):
            # # if taken_at_full:
            # #     # Parsear fecha completa enviada por el cliente (zona horaria del cliente)
            # #     try:
            # #         taken_at_dt = datetime.strptime(taken_at_full, "%Y-%m-%d %H:%M:%S")
            # #     except ValueError:
            # #         # Intentar con formato ISO si falla
            # #         taken_at_dt = datetime.fromisoformat(taken_at_full.replace('Z', '+00:00')).replace(tzinfo=None)
            # # else:
            # #     # Fallback: usar fecha del servidor (comportamiento original)
            # #     today = date.today()
            # #     hour, minute = map(int, time.split(':'))
            # #     taken_at_dt = datetime(today.year, today.month, today.day, hour, minute, 0)
            # # new_intake = IntakeLog(
            # #     treatment_id=treatment_id,
            # #     taken_at=taken_at_dt,
            # #     status="MISSED"
            # # )

            # NUEVO CÓDIGO:
            # taken_at debe ser la hora ACTUAL cuando se marca la dosis
            if taken_at_full:
                # Parsear fecha completa enviada por el cliente (hora actual del cliente)
                try:
                    taken_at_dt = datetime.strptime(taken_at_full, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    # Intentar con formato ISO si falla
                    taken_at_dt = datetime.fromisoformat(taken_at_full.replace('Z', '+00:00')).replace(tzinfo=None)
            else:
                # Fallback: usar hora actual del servidor si no se provee taken_at_full
                taken_at_dt = datetime.now()

            # Crear registro de toma
            # scheduled_time: hora programada (parámetro 'time', ej: "08:00")
            # taken_at: hora exacta cuando se marca la dosis (taken_at_full)
            new_intake = IntakeLog(
                treatment_id=treatment_id,
                taken_at=taken_at_dt,  # Hora actual cuando se marca la dosis
                scheduled_time=time,  # Hora programada de la dosis
                status="MISSED"
            )

            session.add(new_intake)
            await session.commit()
            await session.refresh(new_intake)

            return JSONResponse(
                status_code=201,
                content={
                    "message": f"Dosis de las {time} marcada como omitida correctamente",
                    "data": {
                        "id": new_intake.id,
                        "treatment_id": new_intake.treatment_id,
                        "taken_at": new_intake.taken_at.isoformat() if new_intake.taken_at else None,
                        "scheduled_time": new_intake.scheduled_time,  # Hora programada
                        "status": new_intake.status
                    }
                }
            )

    except Exception as error:
        print("Error al marcar dosis como omitida ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al marcar dosis como omitida"}
        )
