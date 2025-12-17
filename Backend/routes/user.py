from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_
from sqlalchemy.orm import joinedload
from models import User, InputUser, InputUserUpdate, InputPaginatedRequestFilter
from config.db import AsyncSessionLocal
from auth.roles import require_roles
from utils.update import is_valid_change
import traceback

user = APIRouter()


@user.post("/user/paginated")
async def get_users_paginated(req: Request, body: InputPaginatedRequestFilter):
    """
    Obtiene una lista paginada de usuarios con filtros dinámicos.

    Filtros disponibles en body.filters:
    - search: Búsqueda en name y email
    - name: Filtro por nombre
    - email: Filtro por email
    - role: Filtro por rol (ADMIN, ASISTENCIAL, PERSONAL)
    - active: Filtro por estado activo
    - order: "desc" para descendente, "asc" para ascendente

    Returns:
        JSONResponse con lista de usuarios y cursor para siguiente página
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

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
            stmt = select(User)

            # Filtrar por active
            if hasattr(User, "active"):
                active_filter = filters.get("active")
                if active_filter is not None:
                    stmt = stmt.where(User.active.is_(active_filter))
                else:
                    stmt = stmt.where(User.active.is_(True))

            # Búsqueda libre (search) - busca en name y email
            if search:
                pattern = f"%{search}%"
                stmt = stmt.where(
                    or_(
                        User.name.ilike(pattern),
                        User.email.ilike(pattern)
                    )
                )

            # Filtro por name
            name_filter = filters.get("name")
            if name_filter:
                stmt = stmt.where(User.name.ilike(f"%{name_filter}%"))

            # Filtro por email
            email_filter = filters.get("email")
            if email_filter:
                stmt = stmt.where(User.email.ilike(f"%{email_filter}%"))

            # Filtro por role
            role_filter = filters.get("role")
            if role_filter:
                stmt = stmt.where(User.role == role_filter.upper())

            # Aplicar orden
            if order_desc:
                stmt = stmt.order_by(User.id.desc())
            else:
                stmt = stmt.order_by(User.id.asc())

            # Keyset pagination
            if last_seen_id is not None:
                if order_desc:
                    stmt = stmt.where(User.id < last_seen_id)
                else:
                    stmt = stmt.where(User.id > last_seen_id)

            # Aplicar límite
            stmt = stmt.limit(limit)

            # Ejecutar query
            result = await session.execute(stmt)
            users = result.scalars().all()

            # Serializar
            data = []
            for u in users:
                data.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "active": u.active
                })

            # Cursor para siguiente página
            next_cursor = users[-1].id if len(users) == limit else None

            return JSONResponse(
                status_code=200,
                content={"users": data, "next_cursor": next_cursor}
            )

    except Exception as error:
        print("Error al obtener usuarios paginados ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener usuarios"}
        )


@user.get("/user/{user_id}")
async def get_user_by_id(req: Request, user_id: int):
    """
    Obtiene un usuario por su ID.

    Args:
        user_id: ID del usuario

    Returns:
        JSONResponse con los datos del usuario
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            stmt = (
                select(User)
                .options(joinedload(User.patients))
                .where(User.id == user_id)
            )

            result = await session.execute(stmt)
            user_found = result.unique().scalar_one_or_none()

            if not user_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Usuario con ID {user_id} no encontrado"}
                )

            user_data = {
                "id": user_found.id,
                "name": user_found.name,
                "email": user_found.email,
                "role": user_found.role,
                "active": user_found.active,
                "patients_count": len(user_found.patients) if user_found.patients else 0
            }

            return JSONResponse(status_code=200, content=user_data)

    except Exception as error:
        print("Error al obtener usuario ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener usuario"}
        )




@user.put("/user/update")
async def update_user(req: Request, data: InputUserUpdate):
    """
    Actualiza un usuario existente.

    Args:
        data: Datos a actualizar (InputUserUpdate)

    Returns:
        JSONResponse con mensaje de actualización
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            # Buscar usuario
            stmt = select(User).where(User.id == data.id)
            result = await session.execute(stmt)
            user_found = result.scalar_one_or_none()

            if not user_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Usuario con ID {data.id} no encontrado"}
                )

            updated = False

            # Validar y aplicar cambios
            if is_valid_change(data.name, user_found.name):
                user_found.name = data.name
                updated = True

            if is_valid_change(data.email, user_found.email):
                # Verificar que el nuevo email no exista
                stmt_check = select(User).where(User.email == data.email).where(User.id != data.id)
                result_check = await session.execute(stmt_check)
                existing_user = result_check.scalar_one_or_none()

                if existing_user:
                    return JSONResponse(
                        status_code=409,
                        content={"message": f"El email {data.email} ya está registrado"}
                    )

                user_found.email = data.email
                updated = True

            if is_valid_change(data.password, user_found.password):
                user_found.password = data.password  # Debe hashearse en producción
                updated = True

            if is_valid_change(data.role, user_found.role):
                user_found.role = data.role.upper()
                updated = True

            if is_valid_change(data.active, user_found.active):
                user_found.active = data.active
                updated = True

            if updated:
                await session.commit()
                if user_found.active:
                    return JSONResponse(
                        status_code=200,
                        content={"message": "Usuario actualizado correctamente"}
                    )
                else:
                    return JSONResponse(
                        status_code=200,
                        content={"message": "Usuario desactivado correctamente"}
                    )
            else:
                return JSONResponse(
                    status_code=200,
                    content={"message": "No se realizaron cambios"}
                )

    except Exception as error:
        print("Error al actualizar usuario ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al actualizar usuario"}
        )


@user.put("/user/{user_id}/deactivate")
async def deactivate_user(req: Request, user_id: int):
    """
    Desactiva un usuario (soft delete).

    Args:
        user_id: ID del usuario

    Returns:
        JSONResponse con mensaje de confirmación
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.id == user_id)
            result = await session.execute(stmt)
            user_found = result.scalar_one_or_none()

            if not user_found:
                return JSONResponse(
                    status_code=404,
                    content={"message": f"Usuario con ID {user_id} no encontrado"}
                )

            user_found.active = False
            await session.commit()

            return JSONResponse(
                status_code=200,
                content={"message": "Usuario desactivado correctamente"}
            )

    except Exception as error:
        print("Error al desactivar usuario ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al desactivar usuario"}
        )


@user.get("/user/role/{role}")
async def get_users_by_role(req: Request, role: str):
    """
    Obtiene todos los usuarios de un rol específico.

    Args:
        role: Rol del usuario (ADMIN, ASISTENCIAL, PERSONAL)

    Returns:
        JSONResponse con lista de usuarios del rol
    """
    try:
        # Verificar token y rol (SOLO ADMIN)
        payload = require_roles(req.headers, ["ADMIN"])
        if isinstance(payload, JSONResponse):
            return payload

        async with AsyncSessionLocal() as session:
            stmt = (
                select(User)
                .where(User.role == role.upper())
                .where(User.active.is_(True))
                .order_by(User.name.asc())
            )

            result = await session.execute(stmt)
            users = result.scalars().all()

            # Serializar
            data = []
            for u in users:
                data.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "active": u.active
                })

            return JSONResponse(
                status_code=200,
                content={"users": data, "count": len(data), "role": role.upper()}
            )

    except Exception as error:
        print("Error al obtener usuarios por rol ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener usuarios por rol"}
        )
