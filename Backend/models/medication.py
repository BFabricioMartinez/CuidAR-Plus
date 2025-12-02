from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from config.db import Base

# ==========================================
# MODELO SQLALCHEMY
# ==========================================

class Medication(Base):
    __tablename__ = 'medications'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)

    treatments = relationship('Treatment', back_populates='medication')
