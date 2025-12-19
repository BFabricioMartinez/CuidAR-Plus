from typing import Optional
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime
from config.db import Base

#region MODELO SQLALCHEMY

class IntakeLog(Base):
    __tablename__ = 'intake_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    treatment_id = Column(Integer, ForeignKey('treatments.id'), nullable=False)
    taken_at = Column(DateTime, nullable=False)
    # ============================================================================
    # FIX: Agregado scheduled_time para guardar la hora programada de la dosis
    # 
    # PROBLEMA ANTERIOR:
    # - taken_at se guardaba con la hora programada (parámetro 'time')
    # - No había forma de distinguir entre hora programada y hora registrada
    #
    # SOLUCIÓN:
    # - scheduled_time: hora programada de la dosis (ej: "08:00")
    # - taken_at: hora exacta cuando el usuario marca la dosis (ej: "2025-01-15 08:15:30")
    # ============================================================================
    scheduled_time = Column(String, nullable=True)  # Hora programada en formato "HH:MM"
    status = Column(String, nullable=False)

    treatment = relationship('Treatment', back_populates='intake_logs')

#endregion

#region MODELOS PYDANTIC

class IntakeLogCreate(BaseModel):
    treatment_id: int
    taken_at: datetime
    status: str

class IntakeLogResponse(BaseModel):
    id: int
    treatment_id: int
    taken_at: datetime
    scheduled_time: Optional[str] = None  # Hora programada en formato "HH:MM"
    status: str

    class Config:
        from_attributes = True

class InputIntakeLog(BaseModel):
    """
    Modelo para crear un registro de toma.

    IMPORTANTE: taken_at debe ser un string en formato "YYYY-MM-DD HH:MM:SS"
    sin información de timezone para compatibilidad con PostgreSQL TIMESTAMP WITHOUT TIME ZONE.
    """
    treatment_id: int
    taken_at: str  # Cambiado de datetime a str para evitar conversión automática con timezone
    status: str

class InputIntakeLogUpdate(BaseModel):
    """Modelo para actualizar un registro de toma"""
    id: int
    treatment_id: Optional[int] = None
    taken_at: Optional[str] = None  # Cambiado de datetime a str
    status: Optional[str] = None

class ScheduleIntakeInput(BaseModel):
    """Modelo para programar una toma futura con notificaciones push"""
    treatment_id: int
    scheduled_datetime: str  # Formato: "YYYY-MM-DD HH:MM:SS" - Momento exacto de la toma
    scheduled_time: str  # Formato: "HH:MM" - Hora del día (ej: "08:00")

#endregion
