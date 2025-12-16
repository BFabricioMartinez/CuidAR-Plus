from typing import Optional
from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import datetime
from config.db import Base

#region MODELO SQLALCHEMY

class Assignment(Base):
    __tablename__ = 'assignments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    caregiver_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    caregiver = relationship('User', foreign_keys=[caregiver_id])
    patient = relationship('Patient', foreign_keys=[patient_id])

#endregion

#region MODELOS PYDANTIC

class AssignmentCreate(BaseModel):
    caregiver_id: int
    patient_id: int

class AssignmentResponse(BaseModel):
    id: int
    caregiver_id: int
    patient_id: int
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class InputAssignment(BaseModel):
    """Modelo para crear una asignación"""
    caregiver_id: int
    patient_id: int

class InputAssignmentUpdate(BaseModel):
    """Modelo para actualizar una asignación"""
    id: int
    caregiver_id: Optional[int] = None
    patient_id: Optional[int] = None
    active: Optional[bool] = None

#endregion
