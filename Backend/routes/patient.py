from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_, cast, String
from sqlalchemy.orm import joinedload
from models import Patient, User, InputPatient, InputPatientUpdate, InputPaginatedRequestFilter, Assignment
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from utils.update import is_valid_change
import traceback

patient = APIRouter()


@patient.post("/patient/paginated")
async def get_patients_paginated(req: Request, body: InputPaginatedRequestFilter):
    """
    Obtiene una lista paginada de pacientes con filtros dinámicos.

    Filtros disponibles en body.filters:
    - search: Búsqueda en name
    - name: Filtro por nombre
    - active: Filtro por estado activo
    - caregiver_id: Filtro por ID del cuidador
    - order: "desc" para descendente, "asc" para ascendente

    Control de acceso por rol:
    - ADMIN: acceso total a todos los pacientes
    - PERSONAL: solo pacientes donde Patient.caregiver_id == user_id
    - ASISTENCIAL: solo pacientes con Assignment activa donde Assignment.caregiver_id == user_id

    Returns:
        JSONResponse con lista de pacientes y cursor para siguiente página
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
            stmt = (
                select(Patient)
                .options(joinedload(Patient.caregiver))
                .options(joinedload(Patient.treatments))
            )

            # ============================================================================
            # FILTROS POR ROL - Control de acceso basado en ownership
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: solo pacientes propios
                stmt = stmt.where(Patient.caregiver_id == user_id)
            elif user_role == "ASISTENCIAL":
                # ASISTENCIAL: solo pacientes con Assignment activa
                stmt = stmt.join(Assignment, Assignment.patient_id == Patient.id)
                stmt = stmt.where(Assignment.caregiver_id == user_id)
                stmt = stmt.where(Assignment.active == True)
            # ADMIN: sin filtros adicionales (acceso total)

            # Filtrar por active
            if hasattr(Patient, "active"):
                active_filter = filters.get("active")
                if active_filter is not None:
                    stmt = stmt.where(Patient.active.is_(active_filter))
                else:
                    stmt = stmt.where(Patient.active.is_(True))

            # Búsqueda libre (search)
            if search:
                pattern = f"%{search}%"
                stmt = stmt.where(Patient.name.ilike(pattern))

            # Filtro por name
            name_filter = filters.get("name")
            if name_filter:
                stmt = stmt.where(Patient.name.ilike(f"%{name_filter}%"))

            # Filtro por caregiver_id (solo para ADMIN)
            caregiver_id_filter = filters.get("caregiver_id")
            if caregiver_id_filter and user_role == "ADMIN":
                stmt = stmt.where(Patient.caregiver_id == caregiver_id_filter)

            # Aplicar orden
            if order_desc:
                stmt = stmt.order_by(Patient.id.desc())
            else:
                stmt = stmt.order_by(Patient.id.asc())

            # Keyset pagination
            if last_seen_id is not None:
                if order_desc:
                    stmt = stmt.where(Patient.id < last_seen_id)
                else:
                    stmt = stmt.where(Patient.id > last_seen_id)

            # Aplicar límite
            stmt = stmt.limit(limit)

            # ========================================================================
            # FIX: Agregar unique() antes de scalars() para relaciones eager-loaded
            #
            # PROBLEMA:
            # - joinedload() con relaciones one-to-many (como treatments) genera
            #   filas duplicadas en el resultado
            # - SQLAlchemy requiere llamar a unique() para deduplicar los resultados
            #
            # SOLUCIÓN:
            # - Llamar a result.unique() antes de scalars() para eliminar duplicados
            # ========================================================================
            # Ejecutar query
            result = await session.execute(stmt)
            patients = result.unique().scalars().all()

            # Serializar
            data = []
            for p in patients:
                caregiver = p.caregiver
                data.append({
                    "id": p.id,
                    "name": p.name,
                    "caregiver_id": p.caregiver_id,
                    "active": p.active,
                    "notes": p.notes,
                    "caregiver": {
                        "id": caregiver.id if caregiver else None,
                        "name": caregiver.name if caregiver else None,
                        "email": caregiver.email if caregiver else None
                    } if caregiver else None,
                    "treatments_count": len(p.treatments) if p.treatments else 0
                })

            # Cursor para siguiente página
            next_cursor = patients[-1].id if len(patients) == limit else None

            return JSONResponse(
                status_code=200,
                content={"patients": data, "next_cursor": next_cursor}
            )

    except Exception as error:
        print("Error al obtener pacientes paginados ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener pacientes"}
        )


@patient.get("/patient/{patient_id}")
async def get_patient_by_id(req: Request, patient_id: int):
    """
    Obtiene un paciente por su ID.

    Control de acceso por rol:
    - ADMIN: acceso total
    - PERSONAL: solo si Patient.caregiver_id == user_id
    - ASISTENCIAL: solo si existe Assignment activa con Assignment.caregiver_id == user_id

    Args:
        patient_id: ID del paciente

    Returns:
        JSONResponse con los datos del paciente
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
                select(Patient)
                .options(joinedload(Patient.caregiver))
                .options(joinedload(Patient.treatments))
                .where(Patient.id == patient_id)
            )

            result = await session.execute(stmt)
            patient_found = result.unique().scalar_one_or_none()

            if not patient_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Paciente con ID {patient_id} no encontrado"}
                )

            # ============================================================================
            # VALIDACIÓN DE ACCESO POR ROL
            # ============================================================================
            if user_role == "PERSONAL":
                # PERSONAL: verificar ownership
                if patient_found.caregiver_id != user_id:
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

            caregiver = patient_found.caregiver

            patient_data = {
                "id": patient_found.id,
                "name": patient_found.name,
                "caregiver_id": patient_found.caregiver_id,
                "active": patient_found.active,
                "notes": patient_found.notes,
                "caregiver": {
                    "id": caregiver.id if caregiver else None,
                    "name": caregiver.name if caregiver else None,
                    "email": caregiver.email if caregiver else None,
                    "role": caregiver.role if caregiver else None
                } if caregiver else None,
                "treatments_count": len(patient_found.treatments) if patient_found.treatments else 0
            }

            return JSONResponse(status_code=200, content=patient_data)

    except Exception as error:
        print("Error al obtener paciente ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener paciente"}
        )


@patient.post("/patient/create")
async def create_patient(req: Request, data: InputPatient):
    """
    Crea un nuevo paciente.

    Args:
        data: Datos del paciente (InputPatient)

    Returns:
        JSONResponse con el paciente creado
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            # Verificar que el cuidador existe
            stmt_caregiver = select(User).where(User.id == data.caregiver_id)
            result_caregiver = await session.execute(stmt_caregiver)
            caregiver = result_caregiver.scalar_one_or_none()

            if not caregiver:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Cuidador con ID {data.caregiver_id} no encontrado"}
                )

            # Crear paciente
            new_patient = Patient(
                name=data.name,
                caregiver_id=data.caregiver_id,
                notes=data.notes
            )

            session.add(new_patient)
            await session.commit()
            await session.refresh(new_patient)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Paciente creado correctamente",
                    "patient": {
                        "id": new_patient.id,
                        "name": new_patient.name,
                        "caregiver_id": new_patient.caregiver_id,
                        "notes": new_patient.notes,
                        "active": new_patient.active
                    }
                }
            )

    except Exception as error:
        print("Error al crear paciente ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al crear paciente"}
        )


@patient.put("/patient/update")
async def update_patient(req: Request, data: InputPatientUpdate):
    """
    Actualiza un paciente existente.

    Args:
        data: Datos a actualizar (InputPatientUpdate)

    Returns:
        JSONResponse con mensaje de actualización
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            # Buscar paciente
            stmt = select(Patient).where(Patient.id == data.id)
            result = await session.execute(stmt)
            patient_found = result.unique().scalar_one_or_none()

            if not patient_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Paciente con ID {data.id} no encontrado"}
                )

            updated = False

            # Validar y aplicar cambios
            if is_valid_change(data.name, patient_found.name):
                patient_found.name = data.name
                updated = True

            if is_valid_change(data.caregiver_id, patient_found.caregiver_id):
                # Verificar que el nuevo cuidador existe
                stmt_caregiver = select(User).where(User.id == data.caregiver_id)
                result_caregiver = await session.execute(stmt_caregiver)
                caregiver = result_caregiver.scalar_one_or_none()

                if not caregiver:
                    return JSONResponse(
                        status_code=404,
                        content={"message": f"Cuidador con ID {data.caregiver_id} no encontrado"}
                    )

                patient_found.caregiver_id = data.caregiver_id
                updated = True

            if is_valid_change(data.notes, patient_found.notes):
                patient_found.notes = data.notes
                updated = True

            if is_valid_change(data.active, patient_found.active):
                patient_found.active = data.active
                updated = True

            if updated:
                await session.commit()
                if patient_found.active:
                    return JSONResponse(
                        status_code=200,
                        content={"message": "Paciente actualizado correctamente"}
                    )
                else:
                    return JSONResponse(
                        status_code=200,
                        content={"message": "Paciente desactivado correctamente"}
                    )
            else:
                return JSONResponse(
                    status_code=200,
                    content={"message": "No se realizaron cambios"}
                )

    except Exception as error:
        print("Error al actualizar paciente ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al actualizar paciente"}
        )


@patient.put("/patient/{patient_id}/deactivate")
async def deactivate_patient(req: Request, patient_id: int):
    """
    Desactiva un paciente (soft delete).

    Args:
        patient_id: ID del paciente

    Returns:
        JSONResponse con mensaje de confirmación
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            stmt = select(Patient).where(Patient.id == patient_id)
            result = await session.execute(stmt)
            patient_found = result.unique().scalar_one_or_none()

            if not patient_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Paciente con ID {patient_id} no encontrado"}
                )

            patient_found.active = False
            await session.commit()

            return JSONResponse(
                status_code=200,
                content={"message": "Paciente desactivado correctamente"}
            )

    except Exception as error:
        print("Error al desactivar paciente ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al desactivar paciente"}
        )
