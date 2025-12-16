"""
Endpoints optimizados para Admin Dashboard
Agregar estos endpoints a routes/statistics.py en el backend
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from datetime import datetime, timedelta, date
from typing import List, Optional
from pydantic import BaseModel

# ============================================
# MODELOS DE RESPUESTA
# ============================================

class PatientAdherenceResponse(BaseModel):
    patient_id: int
    patient_name: str
    adherence_percentage: Optional[float]
    taken: int
    missed: int
    total: int

class PatientsAdherenceResponse(BaseModel):
    patients: List[PatientAdherenceResponse]

class AdherenceTrendDay(BaseModel):
    date: str
    taken: int
    missed: int
    total: int
    adherence_percentage: float

class AdherenceTrendResponse(BaseModel):
    trend: List[AdherenceTrendDay]

class DosesByHourItem(BaseModel):
    hour: str
    taken: int
    missed: int
    total: int

class DosesByHourResponse(BaseModel):
    doses_by_hour: List[DosesByHourItem]

class TopMedication(BaseModel):
    medication_name: str
    count: int

class TopMedicationsResponse(BaseModel):
    medications: List[TopMedication]

class CaregiverStat(BaseModel):
    caregiver_id: int
    caregiver_name: str
    patient_count: int

class CaregiverStatsResponse(BaseModel):
    caregivers: List[CaregiverStat]

class UsersByRoleItem(BaseModel):
    role: str
    count: int

class UsersByRoleResponse(BaseModel):
    users_by_role: List[UsersByRoleItem]

class TreatmentsStatusResponse(BaseModel):
    active: int
    inactive: int

# ============================================
# ROUTER
# ============================================

router = APIRouter(prefix="/statistics/admin", tags=["admin-statistics"])

# ============================================
# ENDPOINT 1: Adherencia por Paciente (7 días)
# ============================================

@router.get("/patients-adherence", response_model=PatientsAdherenceResponse)
async def get_patients_adherence(db: Session = Depends(get_db)):
    """
    Obtiene la adherencia de todos los pacientes en los últimos 7 días.
    Optimiza múltiples llamadas a /intake/patient/{id}/history
    """
    try:
        today = datetime.now().date()
        seven_days_ago = today - timedelta(days=7)
        
        # Obtener todos los pacientes
        patients = db.query(Patient).all()
        
        adherence_data = []
        
        for patient in patients:
            # Obtener intakes de los últimos 7 días para este paciente
            intakes = db.query(IntakeLog).join(Treatment).filter(
                and_(
                    Treatment.patient_id == patient.id,
                    IntakeLog.taken_at >= datetime.combine(seven_days_ago, datetime.min.time()),
                    IntakeLog.taken_at <= datetime.combine(today, datetime.max.time())
                )
            ).all()
            
            # Calcular estadísticas
            taken = sum(1 for i in intakes if str(i.status).upper().strip() == 'TAKEN')
            missed = sum(1 for i in intakes if str(i.status).upper().strip() == 'MISSED')
            total = taken + missed
            adherence_percentage = (taken / total * 100) if total > 0 else None
            
            adherence_data.append(PatientAdherenceResponse(
                patient_id=patient.id,
                patient_name=patient.name,
                adherence_percentage=adherence_percentage,
                taken=taken,
                missed=missed,
                total=total
            ))
        
        # Ordenar por adherencia descendente
        adherence_data.sort(key=lambda x: x.adherence_percentage if x.adherence_percentage is not None else -1, reverse=True)
        
        return PatientsAdherenceResponse(patients=adherence_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando adherencia: {str(e)}")

# ============================================
# ENDPOINT 2: Tendencia de Adherencia (7 días)
# ============================================

@router.get("/adherence-trend", response_model=AdherenceTrendResponse)
async def get_adherence_trend(db: Session = Depends(get_db)):
    """
    Obtiene la tendencia de adherencia global agrupada por día (últimos 7 días).
    Optimiza múltiples llamadas a /intake/patient/{id}/history
    """
    try:
        today = datetime.now().date()
        seven_days_ago = today - timedelta(days=7)
        
        # Inicializar mapa de días
        day_map = {}
        for i in range(7):
            day = today - timedelta(days=6-i)
            day_map[day.isoformat()] = {'taken': 0, 'missed': 0, 'total': 0}
        
        # Obtener todos los intakes de los últimos 7 días
        intakes = db.query(IntakeLog).join(Treatment).filter(
            and_(
                IntakeLog.taken_at >= datetime.combine(seven_days_ago, datetime.min.time()),
                IntakeLog.taken_at <= datetime.combine(today, datetime.max.time())
            )
        ).all()
        
        # Agrupar por día
        for intake in intakes:
            intake_date = intake.taken_at.date()
            date_key = intake_date.isoformat()
            
            if date_key in day_map:
                day_map[date_key]['total'] += 1
                status = str(intake.status).upper().strip()
                if status == 'TAKEN':
                    day_map[date_key]['taken'] += 1
                elif status == 'MISSED':
                    day_map[date_key]['missed'] += 1
        
        # Convertir a lista ordenada
        trend_data = []
        for i in range(7):
            day = today - timedelta(days=6-i)
            date_key = day.isoformat()
            stats = day_map[date_key]
            adherence_percentage = (stats['taken'] / stats['total'] * 100) if stats['total'] > 0 else 0.0
            
            trend_data.append(AdherenceTrendDay(
                date=date_key,
                taken=stats['taken'],
                missed=stats['missed'],
                total=stats['total'],
                adherence_percentage=round(adherence_percentage, 2)
            ))
        
        return AdherenceTrendResponse(trend=trend_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando tendencia: {str(e)}")

# ============================================
# ENDPOINT 3: Dosis por Hora (Hoy)
# ============================================

@router.get("/doses-by-hour", response_model=DosesByHourResponse)
async def get_doses_by_hour(db: Session = Depends(get_db)):
    """
    Obtiene la distribución de dosis por hora (solo de hoy).
    Optimiza múltiples llamadas a /intake/patient/{id}/history
    """
    try:
        today = datetime.now().date()
        today_start = datetime.combine(today, datetime.min.time())
        tomorrow_start = today_start + timedelta(days=1)
        
        # Obtener todos los intakes de hoy
        intakes = db.query(IntakeLog).join(Treatment).filter(
            and_(
                IntakeLog.taken_at >= today_start,
                IntakeLog.taken_at < tomorrow_start
            )
        ).all()
        
        # Agrupar por hora
        hour_map = {}
        
        for intake in intakes:
            # Determinar la hora
            if intake.scheduled_time:
                hour = intake.scheduled_time[:5]  # HH:MM
            elif intake.taken_at:
                hour = intake.taken_at.strftime('%H:%M')
            else:
                hour = '00:00'
            
            if hour not in hour_map:
                hour_map[hour] = {'taken': 0, 'missed': 0, 'total': 0}
            
            hour_map[hour]['total'] += 1
            status = str(intake.status).lower().strip()
            if status == 'taken':
                hour_map[hour]['taken'] += 1
            elif status == 'missed':
                hour_map[hour]['missed'] += 1
        
        # Convertir a lista ordenada
        doses_by_hour = [
            DosesByHourItem(hour=hour, **stats)
            for hour, stats in sorted(hour_map.items())
        ]
        
        return DosesByHourResponse(doses_by_hour=doses_by_hour)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando dosis por hora: {str(e)}")

# ============================================
# ENDPOINT 4: Top Medicamentos
# ============================================

@router.get("/top-medications", response_model=TopMedicationsResponse)
async def get_top_medications(db: Session = Depends(get_db)):
    """
    Obtiene los medicamentos más prescritos (solo activos).
    Optimiza múltiples llamadas a /treatment/patient/{id}
    """
    try:
        # Obtener todos los tratamientos activos
        treatments = db.query(Treatment).filter(Treatment.active == True).all()
        
        # Contar medicamentos
        medication_map = {}
        for treatment in treatments:
            med_name = treatment.medication_name
            medication_map[med_name] = medication_map.get(med_name, 0) + 1
        
        # Ordenar y limitar a top 10
        medications = [
            TopMedication(medication_name=name, count=count)
            for name, count in sorted(medication_map.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        return TopMedicationsResponse(medications=medications)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando top medicamentos: {str(e)}")

# ============================================
# ENDPOINT 5: Estadísticas de Cuidadores
# ============================================

@router.get("/caregiver-stats", response_model=CaregiverStatsResponse)
async def get_caregiver_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas de cuidadores (cantidad de pacientes asignados).
    Optimiza múltiples llamadas a /user/{id} y /assignment/paginated
    """
    try:
        # Obtener todas las asignaciones activas
        assignments = db.query(Assignment).filter(Assignment.active == True).all()
        
        # Agrupar por cuidador
        caregiver_map = {}
        for assignment in assignments:
            caregiver_id = assignment.caregiver_id
            if caregiver_id not in caregiver_map:
                # Obtener nombre del cuidador
                caregiver = db.query(User).filter(User.id == caregiver_id).first()
                caregiver_name = caregiver.name if caregiver and caregiver.name else (
                    caregiver.email.split('@')[0] if caregiver and caregiver.email else 'Desconocido'
                )
                caregiver_map[caregiver_id] = {
                    'name': caregiver_name,
                    'count': 0
                }
            caregiver_map[caregiver_id]['count'] += 1
        
        # Convertir a lista ordenada
        caregivers = [
            CaregiverStat(
                caregiver_id=caregiver_id,
                caregiver_name=data['name'],
                patient_count=data['count']
            )
            for caregiver_id, data in sorted(caregiver_map.items(), key=lambda x: x[1]['count'], reverse=True)
        ]
        
        return CaregiverStatsResponse(caregivers=caregivers)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando estadísticas de cuidadores: {str(e)}")

# ============================================
# ENDPOINT 6: Usuarios por Rol
# ============================================

@router.get("/users-by-role", response_model=UsersByRoleResponse)
async def get_users_by_role(db: Session = Depends(get_db)):
    """
    Obtiene cantidad de usuarios activos por rol.
    Optimiza múltiples llamadas a /user/role/{role}
    """
    try:
        roles = ['ADMIN', 'ASISTENCIAL', 'PERSONAL']
        users_by_role = []
        
        for role in roles:
            count = db.query(User).filter(
                and_(
                    User.role == role,
                    User.active == True
                )
            ).count()
            
            users_by_role.append(UsersByRoleItem(role=role, count=count))
        
        return UsersByRoleResponse(users_by_role=users_by_role)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando usuarios por rol: {str(e)}")

# ============================================
# ENDPOINT 7: Estado de Tratamientos
# ============================================

@router.get("/treatments-status", response_model=TreatmentsStatusResponse)
async def get_treatments_status(db: Session = Depends(get_db)):
    """
    Obtiene estado de tratamientos (activos vs inactivos).
    Optimiza múltiples llamadas a /treatment/patient/{id}
    """
    try:
        # Contar tratamientos activos e inactivos
        active = db.query(Treatment).filter(Treatment.active == True).count()
        inactive = db.query(Treatment).filter(Treatment.active == False).count()
        
        return TreatmentsStatusResponse(active=active, inactive=inactive)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando estado de tratamientos: {str(e)}")

# ============================================
# NOTAS DE IMPLEMENTACIÓN
# ============================================

"""
IMPORTANTE: Este código es un ejemplo. Necesitas adaptarlo a tu estructura:

1. Importar los modelos de tu base de datos:
   - Patient, Treatment, IntakeLog, Assignment, User
   
2. Importar get_db de tu configuración:
   from database import get_db

3. Agregar el router a tu main.py:
   from routes.statistics import router as statistics_router
   app.include_router(statistics_router)

4. Ajustar los nombres de campos según tu esquema de base de datos:
   - Verificar nombres de columnas (status, taken_at, scheduled_time, etc.)
   - Verificar relaciones entre tablas

5. Optimizar consultas SQL:
   - Usar JOINs explícitos cuando sea posible
   - Usar agregaciones de SQL en lugar de procesamiento en Python
   - Considerar índices en columnas frecuentemente consultadas

6. Manejo de errores:
   - Ajustar según tu sistema de logging
   - Considerar validaciones adicionales
"""
