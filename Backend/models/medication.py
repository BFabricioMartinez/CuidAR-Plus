from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from config.db import Base

#region MODELO SQLALCHEMY

class Medication(Base):
    __tablename__ = 'medications'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    active = Column(Boolean, default=True)

    treatments = relationship('Treatment', back_populates='medication')

#endregion

#region MODELOS PYDANTIC

class MedicationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    active: bool = True

    class Config:
        from_attributes = True

class InputMedication(BaseModel):
    """Modelo para crear una medicación"""
    name: str
    description: Optional[str] = None

class InputMedicationUpdate(BaseModel):
    """Modelo para actualizar una medicación"""
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None

#endregion
