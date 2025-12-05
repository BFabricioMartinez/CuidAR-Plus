from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from datetime import timedelta
import traceback

from models import User, SignupRequest, LoginRequest
from config.db import AsyncSessionLocal
from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    Security,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

auth = APIRouter(prefix="/auth", tags=["Auth"])


@auth.post("/signup")
async def signup(req: Request, user_data: SignupRequest):
    """Registrar un nuevo usuario"""
    try:
        async with AsyncSessionLocal() as session:
            # Verificar si el email ya existe
            stmt = select(User).where(User.email == user_data.email)
            result = await session.execute(stmt)
            existing_user = result.scalar_one_or_none()

            if existing_user:
                return JSONResponse(
                    status_code=400,
                    content={"message": "El email ya esta registrado"}
                )

            # Crear usuario con password hasheada
            new_user = User(
                email=user_data.email,
                password=hash_password(user_data.password),
                role=user_data.role
            )

            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)

            return JSONResponse(
                status_code=201,
                content={
                    "message": "Usuario registrado correctamente",
                    "user": {
                        "id": new_user.id,
                        "email": new_user.email,
                        "role": new_user.role
                    }
                }
            )

    except Exception as error:
        print("Error al registrar usuario ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al registrar usuario"}
        )


@auth.post("/login")
async def login(req: Request, credentials: LoginRequest):
    """Iniciar sesion y obtener token JWT"""
    try:
        async with AsyncSessionLocal() as session:
            # Buscar usuario por email
            stmt = select(User).where(User.email == credentials.email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return JSONResponse(
                    status_code=401,
                    content={"message": "Credenciales incorrectas"}
                )

            # Verificar password
            if not verify_password(credentials.password, user.password):
                return JSONResponse(
                    status_code=401,
                    content={"message": "Credenciales incorrectas"}
                )

            # Crear token
            access_token = create_access_token(
                data={"sub": str(user.id), "email": user.email, "role": user.role},
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )

            # Usar email como name temporalmente si no tiene name
            return JSONResponse(
                status_code=200,
                content={
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": {
                        "id": user.id,
                        "name": user.name if user.name else user.email.split('@')[0],
                        "email": user.email,
                        "role": user.role,
                        "active": user.active
                    }
                }
            )

    except Exception as error:
        print("Error al iniciar sesión ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al iniciar sesión"}
        )


@auth.get("/me")
async def get_me(req: Request):
    """Obtener informacion del usuario autenticado"""
    try:
        # Verificar token
        has_access = Security.verify_token(req.headers)
        if "sub" not in has_access:
            return JSONResponse(status_code=401, content=has_access)

        # Obtener user_id del token decodificado
        user_id = has_access.get("sub")

        async with AsyncSessionLocal() as session:
            stmt = select(User).where(User.id == int(user_id))
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return JSONResponse(
                    status_code=404,
                    content={"message": "Usuario no encontrado"}
                )

            return JSONResponse(
                status_code=200,
                content={
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "name": user.name,
                    "active": user.active
                }
            )

    except Exception as error:
        print("Error al obtener usuario actual ----> ", error)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"message": "Error al obtener usuario actual"}
        )
