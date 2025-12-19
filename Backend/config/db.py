from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

# Obtener DATABASE_URL desde variables de entorno
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cuidar_giw3_user:suPg36WGhYCcRBbFqNI6YGN0L0dq8GgB@dpg-d52fdnv5r7bs73a4oln0-a/cuidar_giw3")

# Si DATABASE_URL viene de Render (empieza con postgres://), convertir a postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Crear async URL reemplazando postgresql:// con postgresql+asyncpg://
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Synchronous engine (for compatibility)
engine = create_engine(DATABASE_URL)

# Async engine
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    future=True
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()