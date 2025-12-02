from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from models import User, UserResponse
from config.db import SessionLocal
from typing import List, Optional

# Router instancia
user = APIRouter(tags=["Users"])


# Dependencia de sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#Traen todos los USUARIOS
@user.get("/users/all", response_model=List[UserResponse])
def get_users(
    role: Optional[str] = Query(None, description="Filtrar por rol: ADMIN, ASISTENCIAL, PERSONAL"),
    active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    search: Optional[str] = Query(None, description="Buscar por nombre o email"),
    db: Session = Depends(get_db)
):
  
    query = db.query(User)
    
    # Filtrar por rol
    if role:
        query = query.filter(User.role == role.upper())
    
    # Filtrar por estado activo
    if active is not None:
        query = query.filter(User.active == active)
    
    # Buscar por nombre o email
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_term)) | (User.email.ilike(search_term))
        )
    
    users = query.all()
    return users


#Obtener un usuario por su ID
@user.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Usuario con ID {user_id} no encontrado"
        )
    
    return user


#Inactivar USUARIO
@user.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Usuario con ID {user_id} no encontrado"
        )
    
    # Soft delete: marcar como inactivo
    user.active = False
    db.commit()
    
    return {
        "message": f"Usuario {user.name} eliminado correctamente",
        "id": user_id
    }