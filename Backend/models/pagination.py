from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

#region MODELOS DE PAGINACIÓN

class InputPaginatedRequestFilter(BaseModel):
    """
    Modelo genérico para paginación con keyset y filtros dinámicos.
    Reutilizable en todos los endpoints paginados del sistema.
    """
    limit: int = Field(
        default=20,
        gt=0,
        le=100,
        description="Cantidad máxima de registros por página"
    )
    last_seen_id: Optional[int] = Field(
        default=None,
        description="ID del último registro visto (cursor para keyset pagination)"
    )
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Filtros opcionales dinámicos (ej: {'search': 'text', 'active': True})"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "limit": 20,
                "last_seen_id": 42,
                "filters": {
                    "search": "texto de búsqueda",
                    "active": True,
                    "role": "ASISTENCIAL"
                }
            }
        }

#endregion
