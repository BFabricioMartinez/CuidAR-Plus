from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.user import user
from routes.patient import patient
from routes.treatment import treatment
from routes.toma import toma
from auth.auth import auth
from routes.others import assignment, statistics


cuidar = FastAPI()


cuidar.add_middleware(
    
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Incluir routers
cuidar.include_router(auth)
cuidar.include_router(user)
cuidar.include_router(patient)
cuidar.include_router(treatment)
cuidar.include_router(toma)
cuidar.include_router(assignment)
cuidar.include_router(statistics)