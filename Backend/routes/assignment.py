from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from models import Assignment, User, Patient, InputAssignment, InputAssignmentUpdate, InputPaginatedRequestFilter
from config.db import AsyncSessionLocal
from auth.security import Security
from utils.update import is_valid_change
import traceback

assignment = APIRouter()


@assignment.post("/assignment/paginated")
async def get_assignments_paginated(req: Request, body: InputPaginatedRequestFilter):
    """
    Obtiene una lista paginada de asignaciones con filtros dinámicos.

    Filtros disponibles en body.filters:
    - caregiver_id: Filtro por ID del cuidador
    - patient_id: Filtro por ID del paciente
    - active: Filtro por estado activo
    - order: "desc" para descendente, "asc" para ascendente
    """
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        limit = body.limit or 20
        last_seen_id = body.last_seen_id
        filters = body.filters or {}
        order_raw = (filters.get("order") or "").lower()

        order_desc = order_raw in ("desc", "newest", "mas_nuevos")

        async with AsyncSessionLocal() as session:
            stmt = (
                select(Assignment)
                .options(joinedload(Assignment.caregiver))
                .options(joinedload(Assignment.patient))
            )

            if hasattr(Assignment, "active"):
                active_filter = filters.get("active")
                if active_filter is not None:
                    stmt = stmt.where(Assignment.active.is_(active_filter))
                else:
                    stmt = stmt.where(Assignment.active.is_(True))

            caregiver_id_filter = filters.get("caregiver_id")
            if caregiver_id_filter:
                stmt = stmt.where(Assignment.caregiver_id == caregiver_id_filter)

            patient_id_filter = filters.get("patient_id")
            if patient_id_filter:
                stmt = stmt.where(Assignment.patient_id == patient_id_filter)

            if order_desc:
                stmt = stmt.order_by(Assignment.id.desc())
            else:
                stmt = stmt.order_by(Assignment.id.asc())

            if last_seen_id is not None:
                if order_desc:
                    stmt = stmt.where(Assignment.id < last_seen_id)
                else:
                    stmt = stmt.where(Assignment.id > last_seen_id)

            stmt = stmt.limit(limit)

            result = await session.execute(stmt)
            assignments = result.scalars().all()

            data = []
            for a in assignments:
                caregiver = a.caregiver
                patient = a.patient
                data.append({
                    "id": a.id,
                    "caregiver_id": a.caregiver_id,
                    "patient_id": a.patient_id,
                    "active": a.active,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                    "caregiver": {
                        "id": caregiver.id if caregiver else None,
                        "name": caregiver.name if caregiver else None,
                        "email": caregiver.email if caregiver else None
                    } if caregiver else None,
                    "patient": {
                        "id": patient.id if patient else None,
                        "name": patient.name if patient else None
                    } if patient else None
                })

            next_cursor = assignments[-1].id if len(assignments) == limit else None

            return JSONResponse(
                status_code=200,
                content={"assignments": data, "next_cursor": next_cursor}
            )

    except Exception as error:
        print("Error al obtener asignaciones paginadas ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener asignaciones"}
        )


@assignment.get("/assignment/{assignment_id}")
async def get_assignment_by_id(req: Request, assignment_id: int):
    """Obtiene una asignación por su ID."""
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = (
                select(Assignment)
                .options(joinedload(Assignment.caregiver))
                .options(joinedload(Assignment.patient))
                .where(Assignment.id == assignment_id)
            )

            result = await session.execute(stmt)
            assignment_found = result.scalar_one_or_none()

            if not assignment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Asignación con ID {assignment_id} no encontrada"}
                )

            caregiver = assignment_found.caregiver
            patient = assignment_found.patient

            assignment_data = {
                "id": assignment_found.id,
                "caregiver_id": assignment_found.caregiver_id,
                "patient_id": assignment_found.patient_id,
                "active": assignment_found.active,
                "created_at": assignment_found.created_at.isoformat() if assignment_found.created_at else None,
                "caregiver": {
                    "id": caregiver.id if caregiver else None,
                    "name": caregiver.name if caregiver else None,
                    "email": caregiver.email if caregiver else None,
                    "role": caregiver.role if caregiver else None
                } if caregiver else None,
                "patient": {
                    "id": patient.id if patient else None,
                    "name": patient.name if patient else None,
                    "caregiver_id": patient.caregiver_id if patient else None
                } if patient else None
            }

            return JSONResponse(status_code=200, content=assignment_data)

    except Exception as error:
        print("Error al obtener asignación ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener asignación"}
        )


@assignment.post("/assignment/create")
async def create_assignment(req: Request, data: InputAssignment):
    """Crea una nueva asignación de cuidador a paciente."""
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el cuidador existe y tiene rol ASISTENCIAL
            stmt_caregiver = select(User).where(User.id == data.caregiver_id)
            result_caregiver = await session.execute(stmt_caregiver)
            caregiver = result_caregiver.scalar_one_or_none()

            if not caregiver:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Cuidador con ID {data.caregiver_id} no encontrado"}
                )

            if caregiver.role != "ASISTENCIAL":
                return JSONResponse(
                    status_code=400,
                    content={"message": "El usuario debe tener rol ASISTENCIAL para ser cuidador"}
                )

            # Verificar que el paciente existe
            stmt_patient = select(Patient).where(Patient.id == data.patient_id)
            result_patient = await session.execute(stmt_patient)
            patient = result_patient.scalar_one_or_none()

            if not patient:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Paciente con ID {data.patient_id} no encontrado"}
                )

            # Verificar que no existe ya una asignación activa
            stmt_check = (
                select(Assignment)
                .where(Assignment.caregiver_id == data.caregiver_id)
                .where(Assignment.patient_id == data.patient_id)
                .where(Assignment.active.is_(True))
            )
            result_check = await session.execute(stmt_check)
            existing = result_check.scalar_one_or_none()

            if existing:
                return JSONResponse(
                    status_code=409,
                    content={"message": "Esta asignación ya existe"}
                )

            new_assignment = Assignment(
                caregiver_id=data.caregiver_id,
                patient_id=data.patient_id
            )

            session.add(new_assignment)
            await session.commit()
            await session.refresh(new_assignment)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Asignación creada correctamente",
                    "assignment": {
                        "id": new_assignment.id,
                        "caregiver_id": new_assignment.caregiver_id,
                        "patient_id": new_assignment.patient_id,
                        "active": new_assignment.active,
                        "created_at": new_assignment.created_at.isoformat() if new_assignment.created_at else None
                    }
                }
            )

    except Exception as error:
        print("Error al crear asignación ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al crear asignación"}
        )


@assignment.put("/assignment/update")
async def update_assignment(req: Request, data: InputAssignmentUpdate):
    """Actualiza una asignación existente."""
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = select(Assignment).where(Assignment.id == data.id)
            result = await session.execute(stmt)
            assignment_found = result.scalar_one_or_none()

            if not assignment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Asignación con ID {data.id} no encontrada"}
                )

            updated = False

            if is_valid_change(data.caregiver_id, assignment_found.caregiver_id):
                stmt_caregiver = select(User).where(User.id == data.caregiver_id)
                result_caregiver = await session.execute(stmt_caregiver)
                caregiver = result_caregiver.scalar_one_or_none()

                if not caregiver or caregiver.role != "ASISTENCIAL":
                    return JSONResponse(
                        status_code=400,
                        content={"message": "El usuario debe existir y tener rol ASISTENCIAL"}
                    )

                assignment_found.caregiver_id = data.caregiver_id
                updated = True

            if is_valid_change(data.patient_id, assignment_found.patient_id):
                stmt_patient = select(Patient).where(Patient.id == data.patient_id)
                result_patient = await session.execute(stmt_patient)
                patient = result_patient.scalar_one_or_none()

                if not patient:
                    return JSONResponse(
                        status_code=404,
                        content={"message": f"Paciente con ID {data.patient_id} no encontrado"}
                    )

                assignment_found.patient_id = data.patient_id
                updated = True

            if is_valid_change(data.active, assignment_found.active):
                assignment_found.active = data.active
                updated = True

            if updated:
                await session.commit()
                return JSONResponse(
                    status_code=200,
                    content={"message": "Asignación actualizada correctamente"}
                )
            else:
                return JSONResponse(
                    status_code=200,
                    content={"message": "No se realizaron cambios"}
                )

    except Exception as error:
        print("Error al actualizar asignación ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al actualizar asignación"}
        )


@assignment.put("/assignment/{assignment_id}/deactivate")
async def deactivate_assignment(req: Request, assignment_id: int):
    """Desactiva una asignación (soft delete)."""
    try:
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = select(Assignment).where(Assignment.id == assignment_id)
            result = await session.execute(stmt)
            assignment_found = result.scalar_one_or_none()

            if not assignment_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Asignación con ID {assignment_id} no encontrada"}
                )

            assignment_found.active = False
            await session.commit()

            return JSONResponse(
                status_code=200,
                content={"message": "Asignación desactivada correctamente"}
            )

    except Exception as error:
        print("Error al desactivar asignación ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al desactivar asignación"}
        )
