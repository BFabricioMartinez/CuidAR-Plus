from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_
from sqlalchemy.orm import joinedload
from models import Medication, InputMedication, InputMedicationUpdate, InputPaginatedRequestFilter
from config.db import AsyncSessionLocal
from auth.security import Security
from utils.update import is_valid_change
import traceback

medication = APIRouter()


@medication.post("/medication/paginated")
async def get_medications_paginated(req: Request, body: InputPaginatedRequestFilter):
    """
    Obtiene una lista paginada de medicamentos con filtros dinámicos.

    Filtros disponibles en body.filters:
    - search: Búsqueda en name y description
    - name: Filtro por nombre
    - active: Filtro por estado activo
    - order: "desc" para descendente, "asc" para ascendente

    Returns:
        JSONResponse con lista de medicamentos y cursor para siguiente página
    """
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "iat" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

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
            stmt = select(Medication)

            # Filtrar por active
            if hasattr(Medication, "active"):
                active_filter = filters.get("active")
                if active_filter is not None:
                    stmt = stmt.where(Medication.active.is_(active_filter))
                else:
                    stmt = stmt.where(Medication.active.is_(True))

            # Búsqueda libre (search)
            if search:
                pattern = f"%{search}%"
                stmt = stmt.where(
                    or_(
                        Medication.name.ilike(pattern),
                        Medication.description.ilike(pattern)
                    )
                )

            # Filtro por name
            name_filter = filters.get("name")
            if name_filter:
                stmt = stmt.where(Medication.name.ilike(f"%{name_filter}%"))

            # Aplicar orden
            if order_desc:
                stmt = stmt.order_by(Medication.id.desc())
            else:
                stmt = stmt.order_by(Medication.id.asc())

            # Keyset pagination
            if last_seen_id is not None:
                if order_desc:
                    stmt = stmt.where(Medication.id < last_seen_id)
                else:
                    stmt = stmt.where(Medication.id > last_seen_id)

            # Aplicar límite
            stmt = stmt.limit(limit)

            # Ejecutar query
            result = await session.execute(stmt)
            medications = result.scalars().all()

            # Serializar
            data = []
            for m in medications:
                data.append({
                    "id": m.id,
                    "name": m.name,
                    "description": m.description,
                    "active": m.active
                })

            # Cursor para siguiente página
            next_cursor = medications[-1].id if len(medications) == limit else None

            return JSONResponse(
                status_code=200,
                content={"medications": data, "next_cursor": next_cursor}
            )

    except Exception as error:
        print("Error al obtener medicamentos paginados ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener medicamentos"}
        )


@medication.get("/medication/{medication_id}")
async def get_medication_by_id(req: Request, medication_id: int):
    """Obtiene un medicamento por su ID."""
    try:
        has_access = Security.verify_token(req.headers)
        if "iat" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = (
                select(Medication)
                .options(joinedload(Medication.treatments))
                .where(Medication.id == medication_id)
            )

            result = await session.execute(stmt)
            medication_found = result.scalar_one_or_none()

            if not medication_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Medicamento con ID {medication_id} no encontrado"}
                )

            medication_data = {
                "id": medication_found.id,
                "name": medication_found.name,
                "description": medication_found.description,
                "active": medication_found.active,
                "treatments_count": len(medication_found.treatments) if medication_found.treatments else 0
            }

            return JSONResponse(status_code=200, content=medication_data)

    except Exception as error:
        print("Error al obtener medicamento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener medicamento"}
        )


@medication.post("/medication/create")
async def create_medication(req: Request, data: InputMedication):
    """Crea un nuevo medicamento."""
    try:
        has_access = Security.verify_token(req.headers)
        if "iat" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            # Verificar que el nombre no exista
            stmt_check = select(Medication).where(Medication.name == data.name)
            result_check = await session.execute(stmt_check)
            existing = result_check.scalar_one_or_none()

            if existing:
                return JSONResponse(
                    status_code=409,
                    content={"message": f"El medicamento {data.name} ya existe"}
                )

            new_medication = Medication(
                name=data.name,
                description=data.description
            )

            session.add(new_medication)
            await session.commit()
            await session.refresh(new_medication)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Medicamento creado correctamente",
                    "medication": {
                        "id": new_medication.id,
                        "name": new_medication.name,
                        "description": new_medication.description,
                        "active": new_medication.active
                    }
                }
            )

    except Exception as error:
        print("Error al crear medicamento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al crear medicamento"}
        )


@medication.put("/medication/update")
async def update_medication(req: Request, data: InputMedicationUpdate):
    """Actualiza un medicamento existente."""
    try:
        has_access = Security.verify_token(req.headers)
        if "iat" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = select(Medication).where(Medication.id == data.id)
            result = await session.execute(stmt)
            medication_found = result.scalar_one_or_none()

            if not medication_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Medicamento con ID {data.id} no encontrado"}
                )

            updated = False

            if is_valid_change(data.name, medication_found.name):
                # Verificar que el nuevo nombre no exista
                stmt_check = select(Medication).where(Medication.name == data.name).where(Medication.id != data.id)
                result_check = await session.execute(stmt_check)
                existing = result_check.scalar_one_or_none()

                if existing:
                    return JSONResponse(
                        status_code=409,
                        content={"message": f"El medicamento {data.name} ya existe"}
                    )

                medication_found.name = data.name
                updated = True

            if is_valid_change(data.description, medication_found.description):
                medication_found.description = data.description
                updated = True

            if is_valid_change(data.active, medication_found.active):
                medication_found.active = data.active
                updated = True

            if updated:
                await session.commit()
                return JSONResponse(
                    status_code=200,
                    content={"message": "Medicamento actualizado correctamente"}
                )
            else:
                return JSONResponse(
                    status_code=200,
                    content={"message": "No se realizaron cambios"}
                )

    except Exception as error:
        print("Error al actualizar medicamento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al actualizar medicamento"}
        )


@medication.put("/medication/{medication_id}/deactivate")
async def deactivate_medication(req: Request, medication_id: int):
    """Desactiva un medicamento (soft delete)."""
    try:
        has_access = Security.verify_token(req.headers)
        if "iat" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        async with AsyncSessionLocal() as session:
            stmt = select(Medication).where(Medication.id == medication_id)
            result = await session.execute(stmt)
            medication_found = result.scalar_one_or_none()

            if not medication_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Medicamento con ID {medication_id} no encontrado"}
                )

            medication_found.active = False
            await session.commit()

            return JSONResponse(
                status_code=200,
                content={"message": "Medicamento desactivado correctamente"}
            )

    except Exception as error:
        print("Error al desactivar medicamento ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al desactivar medicamento"}
        )
