"""
Script para crear un usuario administrador
"""
import asyncio
import sys
import os

# Agregar el directorio actual al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from config.db import AsyncSessionLocal
from models import User
from auth.security import hash_password

async def create_admin_user():
    """Crea un usuario administrador"""
    email = "admin@cuidar.test"
    password = "demo123"
    name = "Administrador"
    role = "ADMIN"
    
    async with AsyncSessionLocal() as session:
        # Verificar si el usuario ya existe
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ El usuario con email {email} ya existe")
            print(f"   ID: {existing_user.id}")
            print(f"   Nombre: {existing_user.name}")
            print(f"   Rol: {existing_user.role}")
            return
        
        # Crear nuevo usuario admin
        new_user = User(
            email=email,
            password=hash_password(password),
            name=name,
            role=role,
            active=True
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        print("✅ Usuario administrador creado exitosamente!")
        print(f"   ID: {new_user.id}")
        print(f"   Nombre: {new_user.name}")
        print(f"   Email: {new_user.email}")
        print(f"   Rol: {new_user.role}")
        print(f"   Contraseña: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin_user())

