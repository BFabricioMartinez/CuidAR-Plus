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

#endregion
