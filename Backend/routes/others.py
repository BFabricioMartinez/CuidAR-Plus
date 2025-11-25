from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.modelo import (Assignment, AssignmentCreate, AssignmentResponse, User, Patient, Treatment, IntakeLog, session)
from typing import List, Optional
from datetime import datetime, date, timedelta

# ============================================s
# ASIGNACION
# ============================================

assignment = APIRouter(tags=["Assignments"])


# Dependencia de sesión de base de datos
def get_db():
    db = session
    try:
        yield db
    finally:
        db.close()


# Listar todos las asignaciones
@assignment.get("/assignments/all", response_model=List[AssignmentResponse])
def get_assignments(
    caregiver_id: Optional[int] = Query(None, description="Filtrar por ID del cuidador"),
    patient_id: Optional[int] = Query(None, description="Filtrar por ID del paciente"),
    db: Session = Depends(get_db)
):

    query = db.query(Assignment).filter(Assignment.active == True)
    
    # Filtrar por cuidador
    if caregiver_id is not None:
        query = query.filter(Assignment.caregiver_id == caregiver_id)
    
    # Filtrar por paciente
    if patient_id is not None:
        query = query.filter(Assignment.patient_id == patient_id)
    
    assignments = query.all()
    return assignments


#Asignar cuidador a paciente
@assignment.post("/assignments/create", response_model=AssignmentResponse)
def create_assignment(
    assignment_data: AssignmentCreate,
    db: Session = Depends(get_db)
):
    # Verificar que el cuidador existe y tiene rol ASISTENCIAL
    caregiver = db.query(User).filter(
        User.id == assignment_data.caregiver_id,
        User.role == "ASISTENCIAL",
        User.active == True
    ).first()
    
    if not caregiver:
        raise HTTPException(
            status_code=404,
            detail="Cuidador no encontrado o no tiene rol ASISTENCIAL"
        )
    
    # Verificar que el paciente existe
    patient = db.query(Patient).filter(Patient.id == assignment_data.patient_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Verificar que no existe ya una asignación activa
    existing = db.query(Assignment).filter(
        Assignment.caregiver_id == assignment_data.caregiver_id,
        Assignment.patient_id == assignment_data.patient_id,
        Assignment.active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Esta asignación ya existe"
        )
    
    # Crear asignación
    new_assignment = Assignment(
        caregiver_id=assignment_data.caregiver_id,
        patient_id=assignment_data.patient_id,
        active=True
    )
    
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    return new_assignment


# Desasignar un cuidador a un paciente
@assignment.delete("/assignments/{id}/delete")
def delete_assignment(id: int, db: Session = Depends(get_db)):

    assignment_found = db.query(Assignment).filter(Assignment.id == id).first()
    
    if not assignment_found:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    # Soft delete
    assignment_found.active = False
    db.commit()
    
    return {
        "message": "Asignación eliminada correctamente",
        "id": id
    }


# ============================================
# ESTADISTICAS
# ============================================

statistics = APIRouter(tags=["Statistics"])


# Resumen - total usuarios activos - total pacientes - total tratamientos - dosis de hoy - Adherencia de hoy
@statistics.get("/statistics/overview")
def get_overview(db: Session = Depends(get_db)):

    # Usuarios activos
    active_users = db.query(func.count(User.id)).filter(User.active == True).scalar()
    
    # Total pacientes
    total_patients = db.query(func.count(Patient.id)).scalar()
    
    # Tratamientos activos
    active_treatments = db.query(func.count(Treatment.id)).filter(
        Treatment.active == True
    ).scalar()
    
    # Dosis de HOY
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    taken_today = db.query(func.count(IntakeLog.id)).filter(
        IntakeLog.taken_at >= today_start,
        IntakeLog.taken_at <= today_end,
        IntakeLog.status == "TAKEN"
    ).scalar()
    
    missed_today = db.query(func.count(IntakeLog.id)).filter(
        IntakeLog.taken_at >= today_start,
        IntakeLog.taken_at <= today_end,
        IntakeLog.status == "MISSED"
    ).scalar()
    
    total_today = taken_today + missed_today
    adherence_today = round((taken_today / total_today * 100), 2) if total_today > 0 else None
    
    return {
        "active_users": active_users or 0,
        "total_patients": total_patients or 0,
        "active_treatments": active_treatments or 0,
        "today_doses": {
            "taken": taken_today or 0,
            "missed": missed_today or 0,
            "total": total_today or 0,
            "adherence_percentage": adherence_today
        }
    }


# Estdisticas personalizadas segun el rol
@statistics.get("/statistics/my-stats")
def get_my_stats(
    user_id: int = Query(..., description="ID del usuario actual"),
    db: Session = Depends(get_db)
):
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    if user.role == "ADMIN":
        # Retornar overview global
        return get_overview(db)
    
    elif user.role == "ASISTENCIAL":
        # Pacientes asignados
        assigned_patients = db.query(func.count(Assignment.id)).filter(
            Assignment.caregiver_id == user_id,
            Assignment.active == True
        ).scalar()
        
        # Obtener IDs de pacientes asignados
        patient_ids = db.query(Assignment.patient_id).filter(
            Assignment.caregiver_id == user_id,
            Assignment.active == True
        ).all()
        patient_ids = [p[0] for p in patient_ids]
        
        # Dosis de HOY de sus pacientes
        taken_today = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
            Treatment.patient_id.in_(patient_ids),
            IntakeLog.taken_at >= today_start,
            IntakeLog.taken_at <= today_end,
            IntakeLog.status == "TAKEN"
        ).scalar() if patient_ids else 0
        
        missed_today = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
            Treatment.patient_id.in_(patient_ids),
            IntakeLog.taken_at >= today_start,
            IntakeLog.taken_at <= today_end,
            IntakeLog.status == "MISSED"
        ).scalar() if patient_ids else 0
        
        total_today = taken_today + missed_today
        adherence_today = round((taken_today / total_today * 100), 2) if total_today > 0 else None
        
        return {
            "role": "ASISTENCIAL",
            "assigned_patients": assigned_patients or 0,
            "today_doses": {
                "taken": taken_today or 0,
                "missed": missed_today or 0,
                "total": total_today or 0,
                "adherence_percentage": adherence_today
            }
        }
    
    elif user.role == "PERSONAL":
        # Obtener su paciente
        patient = db.query(Patient).filter(
            Patient.created_by_user_id == user_id
        ).first()
        
        if not patient:
            return {
                "role": "PERSONAL",
                "message": "No tiene paciente asignado",
                "today_doses": {
                    "taken": 0,
                    "missed": 0,
                    "total": 0,
                    "adherence_percentage": None
                }
            }
        
        # Dosis de HOY
        taken_today = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
            Treatment.patient_id == patient.id,
            IntakeLog.taken_at >= today_start,
            IntakeLog.taken_at <= today_end,
            IntakeLog.status == "TAKEN"
        ).scalar()
        
        missed_today = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
            Treatment.patient_id == patient.id,
            IntakeLog.taken_at >= today_start,
            IntakeLog.taken_at <= today_end,
            IntakeLog.status == "MISSED"
        ).scalar()
        
        total_today = taken_today + missed_today
        adherence_today = round((taken_today / total_today * 100), 2) if total_today > 0 else None
        
        return {
            "role": "PERSONAL",
            "patient_id": patient.id,
            "patient_name": patient.name,
            "today_doses": {
                "taken": taken_today or 0,
                "missed": missed_today or 0,
                "total": total_today or 0,
                "adherence_percentage": adherence_today
            }
        }


# Obtener estadisticas PACIENTe en los ultimos dias
@statistics.get("/statistics/patients/{patient_id}/adherence")
def get_patient_adherence(
    patient_id: int,
    days: int = Query(7, description="Número de días hacia atrás (default: 7)"),
    db: Session = Depends(get_db)
):

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Calcular fecha de inicio
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # Contar tomadas
    taken_count = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
        Treatment.patient_id == patient_id,
        IntakeLog.taken_at >= start_datetime,
        IntakeLog.taken_at <= end_datetime,
        IntakeLog.status == "TAKEN"
    ).scalar()
    
    # Contar omitidas
    missed_count = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
        Treatment.patient_id == patient_id,
        IntakeLog.taken_at >= start_datetime,
        IntakeLog.taken_at <= end_datetime,
        IntakeLog.status == "MISSED"
    ).scalar()
    
    total_count = taken_count + missed_count
    adherence_percentage = round((taken_count / total_count * 100), 2) if total_count > 0 else None
    
    # Desglose diario (opcional, puedes agregarlo después)
    daily_breakdown = []
    current_date = start_date
    while current_date <= end_date:
        day_start = datetime.combine(current_date, datetime.min.time())
        day_end = datetime.combine(current_date, datetime.max.time())
        
        day_taken = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
            Treatment.patient_id == patient_id,
            IntakeLog.taken_at >= day_start,
            IntakeLog.taken_at <= day_end,
            IntakeLog.status == "TAKEN"
        ).scalar()
        
        day_missed = db.query(func.count(IntakeLog.id)).join(Treatment).filter(
            Treatment.patient_id == patient_id,
            IntakeLog.taken_at >= day_start,
            IntakeLog.taken_at <= day_end,
            IntakeLog.status == "MISSED"
        ).scalar()
        
        daily_breakdown.append({
            "date": current_date.isoformat(),
            "taken": day_taken or 0,
            "missed": day_missed or 0
        })
        
        current_date += timedelta(days=1)
    
    return {
        "patient_id": patient_id,
        "patient_name": patient.name,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        },
        "summary": {
            "taken_count": taken_count or 0,
            "missed_count": missed_count or 0,
            "total_count": total_count or 0,
            "adherence_percentage": adherence_percentage
        },
        "daily_breakdown": daily_breakdown
    }