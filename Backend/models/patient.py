from typing import Optional
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from config.db import Base

# ==========================================
# MODELO SQLALCHEMY
# ==========================================

class Patient(Base):
    __tablename__ = 'patients'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    caregiver_id = Column(Integer, ForeignKey('users.id'))
    active = Column(Boolean, default=True)
    notes = Column(String)

    caregiver = relationship('User', back_populates='patients', foreign_keys=[caregiver_id])
    treatments = relationship('Treatment', back_populates='patient')


# ==========================================
# MODELOS PYDANTIC
# ==========================================

class PatientBase(BaseModel):
    name: str

class PatientCreate(PatientBase):
    caregiver_id: int

class PatientResponse(PatientBase):
    id: int
    caregiver_id: int
    active: bool = True
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    caregiver_id: Optional[int] = None
    notes: Optional[str] = None
    active: Optional[bool] = None
