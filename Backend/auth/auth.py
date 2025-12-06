from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel

from models import User, Patient
from config.db import SessionLocal
from auth.security import (hash_password,verify_password,create_access_token,decode_token,oauth2_scheme,ACCESS_TOKEN_EXPIRE_MINUTES,Security)

auth = APIRouter(prefix="/auth", tags=["Auth"])


# ------------------------
# Pydantic
# ------------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = "PERSONAL"

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserAuthResponse(BaseModel):
    id: int
    email: str
    role: str

    class Config:
        from_attributes = True


# ------------------------
# DEPENDENCIAS
# ------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Obtener el usuario actual a partir del token

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido"
        )

    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )

    return user


# ------------------------
# ENDPOINTS
# ------------------------

# Registrar un nuevo usuario
@auth.post("/signup", response_model=UserAuthResponse)
def signup(user_data: SignupRequest, db: Session = Depends(get_db)):
    # Verificar si el email ya existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya esta registrado"
        )

    # Crear usuario con password hasheada
    new_user = User(
        email=user_data.email,
        password=hash_password(user_data.password),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # ============================================================================
    # FIX: Crear automáticamente un Patient cuando el usuario tiene rol PERSONAL
    #
    # PROBLEMA:
    # - Los usuarios con rol PERSONAL necesitan un registro en la tabla Patient
    #   para poder crear tratamientos y gestionar su salud
    # - El modelo Patient no tiene user_id, solo tiene caregiver_id (para ASISTENCIAL)
    # - El frontend asume que existe un Patient asociado al User PERSONAL
    #
    # SOLUCIÓN:
    # - Cuando un usuario se registra con rol PERSONAL, crear automáticamente
    #   un registro Patient asociado
    # - Usar el nombre del email como nombre temporal del paciente
    # - El caregiver_id se deja NULL por ahora (puede asignarse después)
    # ============================================================================
    if user_data.role == "PERSONAL":
        # Crear registro de paciente para usuarios PERSONAL
        new_patient = Patient(
            name=user_data.email.split('@')[0],  # Nombre temporal del email
            caregiver_id=None,  # Sin cuidador asignado inicialmente
            active=True,
            notes=f"Paciente creado automáticamente para usuario {user_data.email}"
        )
        db.add(new_patient)
        db.commit()

    return new_user


# Iniciar sesion y obtener token JWT
@auth.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):

    # Buscar usuario por email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    # Verificar password
    if not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    # ============================================================================
    # FIX: Cambio de create_access_token() a Security.generate_token()
    #
    # PROBLEMA:
    # - create_access_token() genera tokens sin el campo "iat" (issued at)
    # - Security.verify_token() REQUIERE que el token tenga "iat" para validarlo
    # - Esto causaba que todos los endpoints protegidos devolvieran 401 Unauthorized
    #
    # SOLUCIÓN:
    # - Usar Security.generate_token() que sí incluye "iat" en el payload
    # - Esto asegura consistencia entre generación y validación de tokens
    #
    # ANTES: access_token = create_access_token(data={...})
    # AHORA:  access_token = Security.generate_token({...})
    # ============================================================================
    access_token = Security.generate_token({
        "id": user.id,
        "email": user.email,
        "role": user.role
    })

    #  Usar email como name temporalmente
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.email.split('@')[0],
            "email": user.email,
            "role": user.role,
            "active": True
        }
    }


# Obtener informacion del usuario autenticado
@auth.get("/me", response_model=UserAuthResponse)
def get_me(current_user: User = Depends(get_current_user)):

    return current_user
