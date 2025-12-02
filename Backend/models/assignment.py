from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from pydantic import BaseModel
from datetime import datetime
from config.db import Base

# ==========================================
# MODELO SQLALCHEMY
# ==========================================

class Assignment(Base):
    __tablename__ = 'assignments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    caregiver_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# MODELOS PYDANTIC
# ==========================================

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
