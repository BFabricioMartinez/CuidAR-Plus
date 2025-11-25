from typing import Optional
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel, Field
from config.db import engine, Base
from datetime import date, datetime

#region MODELOS SQLALCHEMY ORM TABLAS
# ------------------------
# MODELOS SQLALCHEMY ORM TABLAS
# ------------------------

#Usuarios
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False) 
    active = Column(Boolean, default=True)
    name = Column(String)

    patients = relationship('Patient', back_populates='caregiver', foreign_keys='Patient.caregiver_id')


#Pacientes
class Patient(Base):
    __tablename__ = 'patients'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    caregiver_id = Column(Integer, ForeignKey('users.id'))
    active = Column(Boolean, default=True)
    notes = Column(String)

    caregiver = relationship('User', back_populates='patients', foreign_keys=[caregiver_id])
    treatments = relationship('Treatment', back_populates='patient')


# Medicamentos
class Medication(Base):
    __tablename__ = 'medications'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    
    treatments = relationship('Treatment', back_populates='medication')
    

# Tratamientos
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


# Registros
class IntakeLog(Base):
    __tablename__ = 'intake_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    treatment_id = Column(Integer, ForeignKey('treatments.id'), nullable=False)
    taken_at = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)

    treatment = relationship('Treatment', back_populates='intake_logs')

# Asignaciones
class Assignment(Base):
    __tablename__ = 'assignments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    caregiver_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

#endregion





#region MODELOS Pydantic
# ------------------------
# MODELOS Pydantic
# ------------------------

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    role: str

class UserResponse(UserBase):
    id: int
    role: str
    active: bool = True
    name: Optional[str] = None

    class Config:
        from_attributes = True

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

#endregion


# ------------------------
# CONFIGURACIÓN BASE DE DATOS
# ------------------------

Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
session = Session()