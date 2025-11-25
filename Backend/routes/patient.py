from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.modelo import Patient, PatientCreate, PatientResponse, PatientUpdate, session, Treatment, IntakeLog
from typing import List
from datetime import datetime, date

# Router instancia
patient = APIRouter(tags=["Patients"])


# Dependencia de sesión de base de datos
def get_db():
    db = session
    try:
        yield db
    finally:
        db.close()


#Crear un nuevo Paciente
@patient.post("/patients/create", response_model=PatientResponse)
def create_patient(patient_data: PatientCreate, db: Session = Depends(get_db)):

    new_patient = Patient(
        name=patient_data.name,
        caregiver_id=patient_data.caregiver_id
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


#Obtener todos los pacientes
@patient.get("/patients/all", response_model=List[PatientResponse])
def get_patients(db: Session = Depends(get_db)):

    patients = db.query(Patient).all()
    return patients


#Obtener un paciente por el ID
@patient.get("/patients/{id}", response_model=PatientResponse)
def get_patient(id: int, db: Session = Depends(get_db)):

    patient_found = db.query(Patient).filter(Patient.id == id).first()

    if not patient_found:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    return patient_found


#Actualizar un paciente
@patient.patch("/patients/{id}/update", response_model=PatientResponse)
def update_patient(
    id: int,
    patient_data: PatientUpdate,
    db: Session = Depends(get_db)
):

    patient_found = db.query(Patient).filter(Patient.id == id).first()

    if not patient_found:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    # Actualizar solo los campos enviados
    if patient_data.name is not None:
        patient_found.name = patient_data.name
    if patient_data.caregiver_id is not None:
        patient_found.caregiver_id = patient_data.caregiver_id
    if patient_data.notes is not None:
        patient_found.notes = patient_data.notes

    db.commit()
    db.refresh(patient_found)

    return patient_found


#Eliminar o inactivar paciente
@patient.delete("/patients/{id}/delete")
def delete_patient(id: int, db: Session = Depends(get_db)):

    patient_found = db.query(Patient).filter(Patient.id == id).first()

    if not patient_found:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    patient_found.active = False
    db.commit()

    return {
        "message": f"Paciente {patient_found.name} eliminado correctamente",
        "id": id
    }


#Obtener todos los tratamientos de un PACIENTe
@patient.get("/patients/{id}/treatments")
def get_patient_treatments(id: int, db: Session = Depends(get_db)):

    patient_found = db.query(Patient).filter(Patient.id == id).first()

    if not patient_found:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    treatments = db.query(Treatment).filter(
        Treatment.patient_id == id,
        Treatment.active == True
    ).all()

    return {
        "patient_id": id,
        "patient_name": patient_found.name,
        "treatments": treatments
    }


# Obtener dosis pendientes de HOY para un paciente
@patient.get("/patients/{id}/upcoming-doses")
def get_patient_upcoming_doses(id: int, db: Session = Depends(get_db)):

    patient_found = db.query(Patient).filter(Patient.id == id).first()

    if not patient_found:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    # Obtener tratamientos activos del paciente
    treatments = db.query(Treatment).filter(
        Treatment.patient_id == id,
        Treatment.active == True
    ).all()

    # Obtener logs de HOY
    today = date.today()
    logs = db.query(IntakeLog).join(Treatment).filter(
        Treatment.patient_id == id,
        IntakeLog.taken_at >= datetime.combine(today, datetime.min.time()),
        IntakeLog.taken_at < datetime.combine(today, datetime.max.time())
    ).all()

    return {
        "patient_id": id,
        "patient_name": patient_found.name,
        "date": today.isoformat(),
        "treatments": [
            {
                "id": t.id,
                "med_name": t.medication.name if hasattr(t, 'medication') else None,
                "dosage": t.dosage,
                "frequency": t.frequency
            } for t in treatments
        ],
        "logs_today": len(logs)
    }