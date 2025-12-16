from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import auth
from routes.user import user
from routes.patient import patient
from routes.treatment import treatment
from routes.intake import intake
from routes.assignment import assignment
from routes.statistics import statistics
from config.db import Base, engine

cuidar = FastAPI()

# Ruta raíz
@cuidar.get("/")
async def root():
    return {"message": "CuidAR API", "status": "online"}

# Crear todas las tablas al iniciar la aplicación
Base.metadata.create_all(bind=engine)

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
