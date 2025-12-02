from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import IntakeLog, Treatment, IntakeLogCreate, IntakeLogResponse
from config.db import SessionLocal
from typing import List

# Router instancia
toma = APIRouter(tags=["Tomas"])


# Dependencia de sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


#Registar una toma de medicamento (Tomada/Omitida)
@toma.post("/tomas/create", response_model=IntakeLogResponse)
def registrar_toma(toma_data: IntakeLogCreate, db: Session = Depends(get_db)):

    # Verificar que el tratamiento existe
    treatment = db.query(Treatment).filter(Treatment.id == toma_data.treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")

    nueva_toma = IntakeLog(
        treatment_id=toma_data.treatment_id,
        taken_at=toma_data.taken_at,
        status=toma_data.status
    )

    db.add(nueva_toma)
    db.commit()
    db.refresh(nueva_toma)

    return nueva_toma


#Historial de tomas de un paciente
@toma.get("/tomas/historial/{patient_id}", response_model=List[IntakeLogResponse])
def obtener_historial_paciente(patient_id: int, db: Session = Depends(get_db)):
    
    historial = (
        db.query(IntakeLog)
        .join(Treatment, IntakeLog.treatment_id == Treatment.id)
        .filter(Treatment.patient_id == patient_id)
        .all()
    )

    return historial
