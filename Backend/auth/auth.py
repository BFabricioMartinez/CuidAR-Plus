from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel

from models.modelo import User, session
from auth.security import (hash_password,verify_password,create_access_token,decode_token,oauth2_scheme,ACCESS_TOKEN_EXPIRE_MINUTES)

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
    db = session
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

    # Crear token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

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
