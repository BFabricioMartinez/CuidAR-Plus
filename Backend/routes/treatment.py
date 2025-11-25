from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from models.modelo import Treatment, TreatmentCreate, TreatmentResponse, TreatmentUpdate, Medication, session
from typing import List, Optional

# Router instancia
treatment = APIRouter(tags=["Treatments"])


# Dependencia de sesión de base de datos
def get_db():
    db = session
    try:
        yield db
    finally:
        db.close()


# Listar todos los tratamientos - Filtrar Opcional por paciente o por estado
@treatment.get("/treatments/all", response_model=List[TreatmentResponse])
def get_treatments(
    patient_id: Optional[int] = Query(None, description="Filtrar por ID de paciente"),
    active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    db: Session = Depends(get_db)
):
    query = db.query(Treatment)
    
    # Filtrar por paciente
    if patient_id is not None:
        query = query.filter(Treatment.patient_id == patient_id)
    
    # Filtrar por estado activo
    if active is not None:
        query = query.filter(Treatment.active == active)
    
    treatments = query.all()
    return treatments


# Crear un TRATAMIENTO
@treatment.post("/treatments/create", response_model=TreatmentResponse)
def create_treatment(treatment_data: TreatmentCreate, db: Session = Depends(get_db)):

    # Buscar o crear medicamento
    medication = db.query(Medication).filter(
        Medication.name == treatment_data.medication_name
    ).first()
    
    if not medication:
        # Crear medicamento si no existe
        medication = Medication(name=treatment_data.medication_name)
        db.add(medication)
        db.commit()
        db.refresh(medication)
    
    # Crear tratamiento
    new_treatment = Treatment(
        patient_id=treatment_data.patient_id,
        medication_id=medication.id,
        medication_name=medication.name, 
        dosage=treatment_data.dosage,
        frequency=treatment_data.frequency,
        start_date=treatment_data.start_date,
        end_date=treatment_data.end_date,
        notes=treatment_data.notes,
        description=treatment_data.description,  
    )

    db.add(new_treatment)
    db.commit()
    db.refresh(new_treatment)

    return new_treatment


#Obtener tratamientos de un paciente
@treatment.get("/treatments/patient/{patient_id}", response_model=List[TreatmentResponse])
def get_treatments_by_patient(patient_id: int, db: Session = Depends(get_db)):

    treatments = db.query(Treatment).filter(Treatment.patient_id == patient_id).all()
    return treatments


#Obtener detalle de un tratamiento por el ID
@treatment.get("/treatments/{id}/detail", response_model=TreatmentResponse)
def get_treatment(id: int, db: Session = Depends(get_db)):
    treatment_found = db.query(Treatment).filter(Treatment.id == id).first()
    
    if not treatment_found:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    
    return treatment_found


#Actualizar un tratamiento existente
@treatment.patch("/treatments/{id}/update", response_model=TreatmentResponse)
def update_treatment(
    id: int,
    treatment_data: TreatmentUpdate,
    db: Session = Depends(get_db)
):
    
    treatment_found = db.query(Treatment).filter(Treatment.id == id).first()
    
    if not treatment_found:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    
    # Si cambia el nombre del medicamento, buscar o crear
    if treatment_data.medication_name is not None:
        medication = db.query(Medication).filter(
            Medication.name == treatment_data.medication_name
        ).first()
        
        if not medication:
            medication = Medication(name=treatment_data.medication_name)
            db.add(medication)
            db.commit()
            db.refresh(medication)
        
        treatment_found.medication_id = medication.id
    
    # Actualizar otros campos
    if treatment_data.dosage is not None:
        treatment_found.dosage = treatment_data.dosage
    if treatment_data.frequency is not None:
        treatment_found.frequency = treatment_data.frequency
    if treatment_data.start_date is not None:
        treatment_found.start_date = treatment_data.start_date
    if treatment_data.end_date is not None:
        treatment_found.end_date = treatment_data.end_date
    if treatment_data.notes is not None:
        treatment_found.notes = treatment_data.notes
    if treatment_data.active is not None:
        treatment_found.active = treatment_data.active
    
    db.commit()
    db.refresh(treatment_found)
    
    return treatment_found


#Eliminar o Inactivar Tratamiento
@treatment.delete("/treatments/{id}/delete")
def delete_treatment(id: int, db: Session = Depends(get_db)):
 
    treatment_found = db.query(Treatment).filter(Treatment.id == id).first()
    
    if not treatment_found:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    
    # Soft delete: marcar como inactivo
    treatment_found.active = False
    db.commit()
    
    return {
        "message": "Tratamiento eliminado correctamente",
        "id": id
    }