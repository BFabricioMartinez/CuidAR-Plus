from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from config.db import Base

#region MODELO SQLALCHEMY

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    name = Column(String)

    patients = relationship('Patient', back_populates='caregiver', foreign_keys='Patient.caregiver_id')

#endregion

#region MODELOS PYDANTIC

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

class InputUser(BaseModel):
    """Modelo para crear un usuario"""
    email: str
    password: str
    role: str
    name: Optional[str] = None

class InputUserUpdate(BaseModel):
    """Modelo para actualizar un usuario"""
    id: int
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    name: Optional[str] = None
    active: Optional[bool] = None

#endregion
