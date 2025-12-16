from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from models import Treatment, Patient, Assignment, InputTreatment, InputTreatmentUpdate, InputPaginatedRequestFilter
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from utils.update import is_valid_change
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

    Control de acceso por rol:
    - ADMIN: acceso total a todos los tratamientos
    - PERSONAL: solo tratamientos de pacientes donde Patient.caregiver_id == user_id
    - ASISTENCIAL: solo tratamientos de pacientes con Assignment activa donde Assignment.caregiver_id == user_id

    Returns:
        JSONResponse con lista de tratamientos y cursor para siguiente página
    """
    try:
        # Verificar token y rol (ADMIN, ASISTENCIAL, PERSONAL)
        payload = require_roles(req.headers, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(payload, JSONResponse):
            return payload

        user_id = int(payload["sub"])
        user_role = payload["role"].upper()

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
            stmt = select(Treatment)

            # ============================================================================
            # FILTROS POR ROL - Control de acceso basado en ownership
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: solo tratamientos de pacientes propios
                stmt = stmt.join(Patient, Patient.id == Treatment.patient_id)
                stmt = stmt.where(Patient.caregiver_id == user_id)
            elif user_role == "ASISTENCIAL":
                # ASISTENCIAL: solo tratamientos de pacientes con Assignment activa
                stmt = stmt.join(Patient, Patient.id == Treatment.patient_id)
                stmt = stmt.join(Assignment, Assignment.patient_id == Patient.id)
                stmt = stmt.where(Assignment.caregiver_id == user_id)
                stmt = stmt.where(Assignment.active == True)
            # ADMIN: sin filtros adicionales (acceso total)

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

            # Agregar joinedload para cargar relaciones (después de todos los filtros)
            stmt = stmt.options(joinedload(Treatment.patient))

            # Ejecutar query
            result = await session.execute(stmt)
            treatments = result.unique().scalars().all()

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

    Control de acceso por rol:
    - ADMIN: acceso total
    - PERSONAL: solo si el paciente del tratamiento tiene Patient.caregiver_id == user_id
    - ASISTENCIAL: solo si existe Assignment activa con Assignment.caregiver_id == user_id

    Args:
        treatment_id: ID del tratamiento

    Returns:
        JSONResponse con los datos del tratamiento
    """
    try:
        # Verificar token y rol (ADMIN, ASISTENCIAL, PERSONAL)
        payload = require_roles(req.headers, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(payload, JSONResponse):
            return payload

        user_id = int(payload["sub"])
        user_role = payload["role"].upper()

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

            # ============================================================================
            # VALIDACIÓN DE ACCESO POR ROL
            # ============================================================================
            patient = treatment_found.patient

            if user_role == "PERSONAL":
                # PERSONAL: verificar ownership del paciente
                if not patient or patient.caregiver_id != user_id:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            elif user_role == "ASISTENCIAL":
                # ASISTENCIAL: verificar Assignment activa
                if not patient:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )

                stmt_assignment = (
                    select(Assignment)
                    .where(Assignment.patient_id == patient.id)
                    .where(Assignment.caregiver_id == user_id)
                    .where(Assignment.active == True)
                )
                result_assignment = await session.execute(stmt_assignment)
                assignment = result_assignment.scalar_one_or_none()

                if not assignment:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            # ADMIN: sin validaciones adicionales

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

    Control de acceso por rol:
    - ADMIN: puede crear tratamientos para cualquier paciente
    - PERSONAL: solo puede crear tratamientos para sus propios pacientes (Patient.caregiver_id == user_id)
    - ASISTENCIAL: solo puede crear tratamientos para pacientes con Assignment activa (Assignment.caregiver_id == user_id)

    Args:
        data: Datos del tratamiento (InputTreatment)

    Returns:
        JSONResponse con el tratamiento creado
    """
    try:
        # Verificar token y rol (ADMIN, PERSONAL, ASISTENCIAL)
        payload = require_roles(req.headers, ["ADMIN", "PERSONAL", "ASISTENCIAL"])
        if isinstance(payload, JSONResponse):
            return payload

        user_id = int(payload["sub"])
        user_role = payload["role"].upper()

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

            # ============================================================================
            # VALIDACIÓN DE ACCESO POR ROL
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: verificar ownership del paciente
                if patient.caregiver_id != user_id:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            elif user_role == "ASISTENCIAL":
                # ASISTENCIAL: verificar Assignment activa
                stmt_assignment = (
                    select(Assignment)
                    .where(Assignment.patient_id == data.patient_id)
                    .where(Assignment.caregiver_id == user_id)
                    .where(Assignment.active == True)
                )
                result_assignment = await session.execute(stmt_assignment)
                assignment = result_assignment.scalar_one_or_none()

                if not assignment:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            # ADMIN: sin validaciones adicionales

            # Crear tratamiento
            new_treatment = Treatment(
                patient_id=data.patient_id,
                medication_name=data.medication_name,
                dosage=data.dosage,
                frequency=data.frequency,
                description=data.description,
                start_date=data.start_date,
                end_date=data.end_date,
                notes=data.notes
            )

            session.add(new_treatment)
            await session.commit()
            await session.refresh(new_treatment)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Tratamiento creado correctamente",
                    "treatment": {
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

    Control de acceso por rol:
    - ADMIN: puede actualizar cualquier tratamiento
    - PERSONAL: solo puede actualizar tratamientos de sus propios pacientes (Patient.caregiver_id == user_id)
    - ASISTENCIAL: solo puede actualizar tratamientos de pacientes con Assignment activa (Assignment.caregiver_id == user_id)

    Args:
        data: Datos a actualizar (InputTreatmentUpdate)

    Returns:
        JSONResponse con mensaje de actualización
    """
    try:
        # Verificar token y rol (ADMIN, PERSONAL, ASISTENCIAL)
        payload = require_roles(req.headers, ["ADMIN", "PERSONAL", "ASISTENCIAL"])
        if isinstance(payload, JSONResponse):
            return payload

        user_id = int(payload["sub"])
        user_role = payload["role"].upper()

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

            # ============================================================================
            # VALIDACIÓN DE ACCESO POR ROL
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: verificar ownership del paciente del tratamiento
                stmt_patient_check = select(Patient).where(Patient.id == treatment_found.patient_id)
                result_patient_check = await session.execute(stmt_patient_check)
                patient_check = result_patient_check.scalar_one_or_none()

                if not patient_check or patient_check.caregiver_id != user_id:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            elif user_role == "ASISTENCIAL":
                # ASISTENCIAL: verificar Assignment activa para el paciente del tratamiento
                stmt_assignment = (
                    select(Assignment)
                    .where(Assignment.patient_id == treatment_found.patient_id)
                    .where(Assignment.caregiver_id == user_id)
                    .where(Assignment.active == True)
                )
                result_assignment = await session.execute(stmt_assignment)
                assignment = result_assignment.scalar_one_or_none()

                if not assignment:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            # ADMIN: sin validaciones adicionales

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

                # ============================================================================
                # VALIDACIÓN ADICIONAL: Si se cambia el paciente, verificar acceso al nuevo paciente
                # ============================================================================
                if user_role == "PERSONAL":
                    # PERSONAL: verificar ownership del nuevo paciente
                    if patient.caregiver_id != user_id:
                        return JSONResponse(
                            status_code=403,
                            content={"message": "No tienes acceso al paciente seleccionado"}
                        )
                elif user_role == "ASISTENCIAL":
                    # ASISTENCIAL: verificar Assignment activa para el nuevo paciente
                    stmt_new_assignment = (
                        select(Assignment)
                        .where(Assignment.patient_id == data.patient_id)
                        .where(Assignment.caregiver_id == user_id)
                        .where(Assignment.active == True)
                    )
                    result_new_assignment = await session.execute(stmt_new_assignment)
                    new_assignment = result_new_assignment.scalar_one_or_none()

                    if not new_assignment:
                        return JSONResponse(
                            status_code=403,
                            content={"message": "No tienes acceso al paciente seleccionado"}
                        )
                # ADMIN: sin validaciones adicionales

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
                treatment_found.start_date = data.start_date
                updated = True

            if is_valid_change(data.end_date, treatment_found.end_date):
                treatment_found.end_date = data.end_date
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

    Control de acceso por rol:
    - ADMIN: puede desactivar cualquier tratamiento
    - PERSONAL: solo puede desactivar tratamientos de sus propios pacientes (Patient.caregiver_id == user_id)

    Args:
        treatment_id: ID del tratamiento

    Returns:
        JSONResponse con mensaje de confirmación
    """
    try:
        # Verificar token y rol (ADMIN, PERSONAL)
        payload = require_roles(req.headers, ["ADMIN", "PERSONAL"])
        if isinstance(payload, JSONResponse):
            return payload

        user_id = int(payload["sub"])
        user_role = payload["role"].upper()

        async with AsyncSessionLocal() as session:
            stmt = select(Treatment).where(Treatment.id == treatment_id)
            result = await session.execute(stmt)
            treatment_found = result.scalar_one_or_none()

            if not treatment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Tratamiento con ID {treatment_id} no encontrado"}
                )

            # ============================================================================
            # VALIDACIÓN DE ACCESO POR ROL
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: verificar ownership del paciente del tratamiento
                stmt_patient_check = select(Patient).where(Patient.id == treatment_found.patient_id)
                result_patient_check = await session.execute(stmt_patient_check)
                patient_check = result_patient_check.scalar_one_or_none()

                if not patient_check or patient_check.caregiver_id != user_id:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            # ADMIN: sin validaciones adicionales

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

    Control de acceso por rol:
    - ADMIN: puede ver tratamientos de cualquier paciente
    - PERSONAL: solo puede ver tratamientos de sus propios pacientes (Patient.caregiver_id == user_id)
    - ASISTENCIAL: solo puede ver tratamientos de pacientes con Assignment activa donde Assignment.caregiver_id == user_id

    Args:
        patient_id: ID del paciente

    Returns:
        JSONResponse con lista de tratamientos del paciente
    """
    try:
        # Verificar token y rol (ADMIN, ASISTENCIAL, PERSONAL)
        payload = require_roles(req.headers, ["ADMIN", "ASISTENCIAL", "PERSONAL"])
        if isinstance(payload, JSONResponse):
            return payload

        user_id = int(payload["sub"])
        user_role = payload["role"].upper()

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

            # ============================================================================
            # VALIDACIÓN DE ACCESO POR ROL
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: verificar ownership del paciente
                if patient.caregiver_id != user_id:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            elif user_role == "ASISTENCIAL":
                # ASISTENCIAL: verificar Assignment activa
                stmt_assignment = (
                    select(Assignment)
                    .where(Assignment.patient_id == patient_id)
                    .where(Assignment.caregiver_id == user_id)
                    .where(Assignment.active == True)
                )
                result_assignment = await session.execute(stmt_assignment)
                assignment = result_assignment.scalar_one_or_none()

                if not assignment:
                    return JSONResponse(
                        status_code=403,
                        content={"message": "Acceso denegado"}
                    )
            # ADMIN: sin validaciones adicionales

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
