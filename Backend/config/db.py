from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base



# Conexion a la DB

engine = create_engine(
    "postgresql://postgres:123@localhost:5432/Cuidar",
    pool_size=10,            
    max_overflow=20,         
    pool_timeout=10,         
    pool_recycle=1800,       
    echo=False               
)

Base = declarative_base()