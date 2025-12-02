from typing import Optional
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from datetime import date
from config.db import Base

# ==========================================
# MODELO SQLALCHEMY
# ==========================================

class Treatment(Base):
    __tablename__ = 'treatments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    medication_id = Column(Integer, ForeignKey('medications.id'))
    medication_name = Column(String, nullable=False)
    dosage = Column(String)
    frequency = Column(String, nullable=False)
    description = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    notes = Column(String)
    active = Column(Boolean, default=True)

    patient = relationship('Patient', back_populates='treatments')
    intake_logs = relationship('IntakeLog', back_populates='treatment')
    medication = relationship('Medication', back_populates='treatments')


# ==========================================
# MODELOS PYDANTIC
# ==========================================

class TreatmentCreate(BaseModel):
    patient_id: int
    medication_name: str
    dosage: Optional[str] = None
    frequency: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

class TreatmentResponse(BaseModel):
    id: int
    patient_id: int
    medication_name: str
    dosage: Optional[str] = None
    frequency: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    active: bool = True

    class Config:
        from_attributes = True

class TreatmentUpdate(BaseModel):
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    active: Optional[bool] = None
