from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from models import Treatment, Patient, InputTreatment, InputTreatmentUpdate, InputPaginatedRequestFilter
from config.db import AsyncSessionLocal
from auth.security import Security
from utils.update import is_valid_change
from datetime import datetime
import traceback

treatment = APIRouter()


@treatment.post("/treatment/paginated")
async def get_treatments_paginated(req: Request, body: InputPaginatedRequestFilter):
    """
    Obtiene una lista paginada de tratamientos con filtros dinámicos.

    Filtros disponibles en body.filters:
    - search: Búsqueda en medication_name
    - medication_name: Filtro por nombre del medicamento
    - patient_id: Filtro por ID del paciente
    - active: Filtro por estado activo
    - order: "desc" para descendente, "asc" para ascendente

    Returns:
        JSONResponse con lista de tratamientos y cursor para siguiente página
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        # Obtener user_id y role del token
        user_id = has_access.get("sub")
        user_role = has_access.get("role")

        # Extraer parámetros
        limit = body.limit or 20
        last_seen_id = body.last_seen_id
        filters = body.filters or {}
        search = (filters.get("search") or "").strip()
        order_raw = (filters.get("order") or "").lower()

        # Determinar orden
        order_desc = order_raw in ("desc", "newest", "mas_nuevos")

        async with AsyncSessionLocal() as session:
            # Construir query base
            stmt = (
                select(Treatment)
                .options(joinedload(Treatment.patient))
            )

            # Filtrar por role del usuario
            if user_role == "PERSONAL":
                # Usuario PERSONAL: solo ver tratamientos de sus propios pacientes
                stmt = stmt.join(Patient).where(Patient.caregiver_id == int(user_id))
            elif user_role == "ASISTENCIAL":
                # Usuario ASISTENCIAL: solo ver tratamientos de pacientes asignados
                from models import Assignment
                stmt = (
                    stmt.join(Patient)
                    .join(Assignment, Assignment.patient_id == Patient.id)
                    .where(Assignment.caregiver_id == int(user_id))
                    .where(Assignment.active.is_(True))
                )
            # Si es ADMIN, no se aplica filtro adicional (ve todos)

            # Filtrar por active
            if hasattr(Treatment, "active"):
                active_filter = filters.get("active")
                if active_filter is not None:
                    stmt = stmt.where(Treatment.active.is_(active_filter))
                else:
                    stmt = stmt.where(Treatment.active.is_(True))

            # Búsqueda libre (search)
            if search:
                pattern = f"%{search}%"
                stmt = stmt.where(Treatment.medication_name.ilike(pattern))

            # Filtro por medication_name
            medication_name_filter = filters.get("medication_name")
            if medication_name_filter:
                stmt = stmt.where(Treatment.medication_name.ilike(f"%{medication_name_filter}%"))

            # Filtro por patient_id
            patient_id_filter = filters.get("patient_id")
            if patient_id_filter:
                stmt = stmt.where(Treatment.patient_id == patient_id_filter)

            # Aplicar orden
            if order_desc:
                stmt = stmt.order_by(Treatment.id.desc())
            else:
                stmt = stmt.order_by(Treatment.id.asc())

            # Keyset pagination
            if last_seen_id is not None:
                if order_desc:
                    stmt = stmt.where(Treatment.id < last_seen_id)
                else:
                    stmt = stmt.where(Treatment.id > last_seen_id)

            # Aplicar límite
            stmt = stmt.limit(limit)

            # Ejecutar query
            result = await session.execute(stmt)
            treatments = result.scalars().all()

            # Serializar
            data = []
            for t in treatments:
                patient = t.patient
                data.append({
                    "id": t.id,
                    "patient_id": t.patient_id,
                    "medication_name": t.medication_name,
                    "dosage": t.dosage,
                    "frequency": t.frequency,
                    "description": t.description,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "end_date": t.end_date.isoformat() if t.end_date else None,
                    "notes": t.notes,
                    "active": t.active,
                    "patient": {
                        "id": patient.id if patient else None,
                        "name": patient.name if patient else None,
                        "caregiver_id": patient.caregiver_id if patient else None
                    } if patient else None
                })

            # Cursor para siguiente página
            next_cursor = treatments[-1].id if len(treatments) == limit else None

            return JSONResponse(
                status_code=200,
                content={"treatments": data, "next_cursor": next_cursor}
            )

    except Exception as error:
        print("Error al obtener tratamientos paginados ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener tratamientos"}
        )


@treatment.get("/treatment/{treatment_id}")
async def get_treatment_by_id(req: Request, treatment_id: int):
    """
    Obtiene un tratamiento por su ID.

    Args:
        treatment_id: ID del tratamiento

    Returns:
        JSONResponse con los datos del tratamiento
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = (
                select(Treatment)
                .options(joinedload(Treatment.patient))
                .options(joinedload(Treatment.intake_logs))
                .where(Treatment.id == treatment_id)
            )

            result = await session.execute(stmt)
            treatment_found = result.unique().scalar_one_or_none()

            if not treatment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {treatment_id} no encontrado"}
                )

            patient = treatment_found.patient

            treatment_data = {
                "id": treatment_found.id,
                "patient_id": treatment_found.patient_id,
                "medication_name": treatment_found.medication_name,
                "dosage": treatment_found.dosage,
                "frequency": treatment_found.frequency,
                "description": treatment_found.description,
                "start_date": treatment_found.start_date.isoformat() if treatment_found.start_date else None,
                "end_date": treatment_found.end_date.isoformat() if treatment_found.end_date else None,
                "notes": treatment_found.notes,
                "active": treatment_found.active,
                "patient": {
                    "id": patient.id if patient else None,
                    "name": patient.name if patient else None,
                    "caregiver_id": patient.caregiver_id if patient else None
                } if patient else None,
                "intake_logs_count": len(treatment_found.intake_logs) if treatment_found.intake_logs else 0
            }

            return JSONResponse(status_code=200, content=treatment_data)

    except Exception as error:
        print("Error al obtener tratamiento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener tratamiento"}
        )


@treatment.post("/treatment/create")
async def create_treatment(req: Request, data: InputTreatment):
    """
    Crea un nuevo tratamiento.

    Args:
        data: Datos del tratamiento (InputTreatment)

    Returns:
        JSONResponse con el tratamiento creado
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el paciente existe
            stmt_patient = select(Patient).where(Patient.id == data.patient_id)
            result_patient = await session.execute(stmt_patient)
            patient = result_patient.scalar_one_or_none()

            if not patient:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Paciente con ID {data.patient_id} no encontrado"}
                )

            # Convertir fechas de string a datetime
            start_date_dt = None
            if data.start_date:
                try:
                    start_date_dt = datetime.fromisoformat(data.start_date.replace('Z', '+00:00')).replace(tzinfo=None)
                except ValueError:
                    start_date_dt = datetime.strptime(data.start_date, "%Y-%m-%d")

            end_date_dt = None
            if data.end_date:
                try:
                    end_date_dt = datetime.fromisoformat(data.end_date.replace('Z', '+00:00')).replace(tzinfo=None)
                except ValueError:
                    end_date_dt = datetime.strptime(data.end_date, "%Y-%m-%d")

            # Crear tratamiento
            new_treatment = Treatment(
                patient_id=data.patient_id,
                medication_name=data.medication_name,
                dosage=data.dosage,
                frequency=data.frequency,
                description=data.description,
                start_date=start_date_dt,
                end_date=end_date_dt,
                notes=data.notes
            )

            session.add(new_treatment)
            await session.commit()
            await session.refresh(new_treatment)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Tratamiento creado correctamente",
                    "data": {
                        "id": new_treatment.id,
                        "patient_id": new_treatment.patient_id,
                        "medication_name": new_treatment.medication_name,
                        "dosage": new_treatment.dosage,
                        "frequency": new_treatment.frequency,
                        "description": new_treatment.description,
                        "start_date": new_treatment.start_date.isoformat() if new_treatment.start_date else None,
                        "end_date": new_treatment.end_date.isoformat() if new_treatment.end_date else None,
                        "notes": new_treatment.notes,
                        "active": new_treatment.active
                    }
                }
            )

    except Exception as error:
        print("Error al crear tratamiento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al crear tratamiento"}
        )


@treatment.put("/treatment/update")
async def update_treatment(req: Request, data: InputTreatmentUpdate):
    """
    Actualiza un tratamiento existente.

    Args:
        data: Datos a actualizar (InputTreatmentUpdate)

    Returns:
        JSONResponse con mensaje de actualización
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Buscar tratamiento
            stmt = select(Treatment).where(Treatment.id == data.id)
            result = await session.execute(stmt)
            treatment_found = result.scalar_one_or_none()

            if not treatment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {data.id} no encontrado"}
                )

            updated = False

            # Validar y aplicar cambios
            if is_valid_change(data.patient_id, treatment_found.patient_id):
                # Verificar que el nuevo paciente existe
                stmt_patient = select(Patient).where(Patient.id == data.patient_id)
                result_patient = await session.execute(stmt_patient)
                patient = result_patient.scalar_one_or_none()

                if not patient:
                    return JSONResponse(
                        status_code=404,
                        content={"message": f"Paciente con ID {data.patient_id} no encontrado"}
                    )

                treatment_found.patient_id = data.patient_id
                updated = True

            if is_valid_change(data.medication_name, treatment_found.medication_name):
                treatment_found.medication_name = data.medication_name
                updated = True

            if is_valid_change(data.dosage, treatment_found.dosage):
                treatment_found.dosage = data.dosage
                updated = True

            if is_valid_change(data.frequency, treatment_found.frequency):
                treatment_found.frequency = data.frequency
                updated = True

            if is_valid_change(data.description, treatment_found.description):
                treatment_found.description = data.description
                updated = True

            if is_valid_change(data.start_date, treatment_found.start_date):
                # Convertir string a datetime
                if data.start_date:
                    try:
                        treatment_found.start_date = datetime.fromisoformat(data.start_date.replace('Z', '+00:00')).replace(tzinfo=None)
                    except ValueError:
                        treatment_found.start_date = datetime.strptime(data.start_date, "%Y-%m-%d")
                else:
                    treatment_found.start_date = None
                updated = True

            if is_valid_change(data.end_date, treatment_found.end_date):
                # Convertir string a datetime
                if data.end_date:
                    try:
                        treatment_found.end_date = datetime.fromisoformat(data.end_date.replace('Z', '+00:00')).replace(tzinfo=None)
                    except ValueError:
                        treatment_found.end_date = datetime.strptime(data.end_date, "%Y-%m-%d")
                else:
                    treatment_found.end_date = None
                updated = True

            if is_valid_change(data.notes, treatment_found.notes):
                treatment_found.notes = data.notes
                updated = True

            if is_valid_change(data.active, treatment_found.active):
                treatment_found.active = data.active
                updated = True

            if updated:
                await session.commit()
                if treatment_found.active:
                    return JSONResponse(
                        status_code=200,
                        content={"message": "Tratamiento actualizado correctamente"}
                    )
                else:
                    return JSONResponse(
                        status_code=200,
                        content={"message": "Tratamiento desactivado correctamente"}
                    )
            else:
                return JSONResponse(
                    status_code=200,
                    content={"message": "No se realizaron cambios"}
                )

    except Exception as error:
        print("Error al actualizar tratamiento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al actualizar tratamiento"}
        )


@treatment.put("/treatment/{treatment_id}/deactivate")
async def deactivate_treatment(req: Request, treatment_id: int):
    """
    Desactiva un tratamiento (soft delete).

    Args:
        treatment_id: ID del tratamiento

    Returns:
        JSONResponse con mensaje de confirmación
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = select(Treatment).where(Treatment.id == treatment_id)
            result = await session.execute(stmt)
            treatment_found = result.scalar_one_or_none()

            if not treatment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {treatment_id} no encontrado"}
                )

            treatment_found.active = False
            await session.commit()

            return JSONResponse(
                status_code=200,
                content={"message": "Tratamiento desactivado correctamente"}
            )

    except Exception as error:
        print("Error al desactivar tratamiento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al desactivar tratamiento"}
        )


@treatment.get("/treatment/patient/{patient_id}")
async def get_treatments_by_patient(req: Request, patient_id: int):
    """
    Obtiene todos los tratamientos de un paciente.

    Args:
        patient_id: ID del paciente

    Returns:
        JSONResponse con lista de tratamientos del paciente
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        # Obtener user_id y role del token
        user_id = has_access.get("sub")
        user_role = has_access.get("role")

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

            # Verificar permisos según rol
            if user_role == "PERSONAL":
                # Usuario PERSONAL: solo puede ver pacientes propios
                if patient.caregiver_id != int(user_id):
                    return JSONResponse(
                        status_code=403,
                        content={"message": "No tienes permiso para ver este paciente"}
                    )
            elif user_role == "ASISTENCIAL":
                # Usuario ASISTENCIAL: solo puede ver pacientes asignados
                from models import Assignment
                stmt_assignment = (
                    select(Assignment)
                    .where(Assignment.patient_id == patient_id)
                    .where(Assignment.caregiver_id == int(user_id))
                    .where(Assignment.active.is_(True))
                )
                result_assignment = await session.execute(stmt_assignment)
                assignment = result_assignment.scalar_one_or_none()

                if not assignment:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "No tienes permiso para ver este paciente"}
                    )
            # Si es ADMIN, tiene permiso para ver todos

            # Obtener tratamientos del paciente (solo activos por defecto)
            stmt = (
                select(Treatment)
                .where(Treatment.patient_id == patient_id)
                .where(Treatment.active.is_(True))
                .order_by(Treatment.id.desc())
            )

            result = await session.execute(stmt)
            treatments = result.scalars().all()

            # Serializar
            data = []
            for t in treatments:
                data.append({
                    "id": t.id,
                    "medication_name": t.medication_name,
                    "dosage": t.dosage,
                    "frequency": t.frequency,
                    "description": t.description,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "end_date": t.end_date.isoformat() if t.end_date else None,
                    "notes": t.notes,
                    "active": t.active
                })

            return JSONResponse(
                status_code=200,
                content={"treatments": data, "count": len(data)}
            )

    except Exception as error:
        print("Error al obtener tratamientos del paciente ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener tratamientos del paciente"}
        )
