from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes.auth import auth
from routes.user import user
from routes.patient import patient
from routes.treatment import treatment
from routes.intake import intake
from routes.assignment import assignment
from routes.statistics import statistics
from routes.push import push
from config.db import Base, engine
from services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja el ciclo de vida de la aplicación.
    Se ejecuta al iniciar y al cerrar la app.
    """
    # Startup
    print("🚀 Iniciando CuidAR API...")

    # Crear tablas en la base de datos
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas de base de datos creadas/verificadas")

    # Iniciar scheduler de notificaciones
    start_scheduler()

    yield

    # Shutdown
    print("🛑 Cerrando CuidAR API...")
    shutdown_scheduler()


cuidar = FastAPI(lifespan=lifespan)

# Ruta raíz
@cuidar.get("/")
async def root():
    return {"message": "CuidAR API", "status": "online"}

# Configurar CORS
cuidar.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Incluir routers
cuidar.include_router(auth)
cuidar.include_router(user)
cuidar.include_router(patient)
cuidar.include_router(treatment)
cuidar.include_router(intake)
cuidar.include_router(assignment)
cuidar.include_router(statistics)
cuidar.include_router(push)
