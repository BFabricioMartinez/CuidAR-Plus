# Endpoints Optimizados para Admin Dashboard

Este archivo contiene los endpoints que deben agregarse a `statistics.py` en el backend para optimizar las llamadas del Admin Dashboard.

## Análisis de Llamadas Actuales

Las llamadas actuales muestran:
- Múltiples llamadas a `/patient/paginated` (repetidas)
- Múltiples llamadas a `/intake/patient/{id}/history` para cada paciente
- Múltiples llamadas a `/treatment/patient/{id}` para cada paciente
- Múltiples llamadas a `/user/role/{role}` para cada rol
- Múltiples llamadas a `/user/{id}` para obtener nombres de cuidadores
- Múltiples llamadas a `/assignment/paginated`

## Endpoints a Crear

### 1. GET `/statistics/admin/patients-adherence`
**Propósito**: Obtener adherencia de todos los pacientes (últimos 7 días)

**Respuesta**:
```json
{
  "patients": [
    {
      "patient_id": 1,
      "patient_name": "Juan Pérez",
      "adherence_percentage": 85.5,
      "taken": 17,
      "missed": 3,
      "total": 20
    }
  ]
}
```

**Lógica del backend**:
- Obtener todos los pacientes de una vez
- Para cada paciente, obtener intakes de los últimos 7 días
- Calcular taken/missed/total y adherence_percentage
- Ordenar por adherence_percentage descendente

---

### 2. GET `/statistics/admin/adherence-trend`
**Propósito**: Obtener tendencia de adherencia global (últimos 7 días, agrupado por día)

**Respuesta**:
```json
{
  "trend": [
    {
      "date": "2024-01-15",
      "taken": 45,
      "missed": 5,
      "total": 50,
      "adherence_percentage": 90.0
    },
    {
      "date": "2024-01-16",
      "taken": 48,
      "missed": 2,
      "total": 50,
      "adherence_percentage": 96.0
    }
    // ... 7 días total
  ]
}
```

**Lógica del backend**:
- Obtener todos los pacientes
- Para cada paciente, obtener intakes de los últimos 7 días
- Agrupar todos los intakes por fecha (día)
- Calcular taken/missed/total y adherence_percentage por día
- Incluir todos los días de los últimos 7 días (incluso si no hay datos)

---

### 3. GET `/statistics/admin/doses-by-hour`
**Propósito**: Obtener distribución de dosis por hora (solo de hoy)

**Respuesta**:
```json
{
  "doses_by_hour": [
    {
      "hour": "08:00",
      "taken": 5,
      "missed": 1,
      "total": 6
    },
    {
      "hour": "12:00",
      "taken": 8,
      "missed": 0,
      "total": 8
    }
    // ... todas las horas con dosis
  ]
}
```

**Lógica del backend**:
- Obtener todos los pacientes
- Para cada paciente, obtener intakes de hoy
- Agrupar por hora (usar `scheduled_time` o `taken_at` si no hay `scheduled_time`)
- Calcular taken/missed/total por hora
- Ordenar por hora ascendente

---

### 4. GET `/statistics/admin/top-medications`
**Propósito**: Obtener medicamentos más prescritos (solo activos)

**Respuesta**:
```json
{
  "medications": [
    {
      "medication_name": "Paracetamol",
      "count": 15
    },
    {
      "medication_name": "Ibuprofeno",
      "count": 12
    }
    // ... top 10
  ]
}
```

**Lógica del backend**:
- Obtener todos los pacientes
- Para cada paciente, obtener tratamientos activos
- Contar medicamentos por nombre
- Ordenar por count descendente
- Limitar a top 10

---

### 5. GET `/statistics/admin/caregiver-stats`
**Propósito**: Obtener estadísticas de cuidadores (cantidad de pacientes asignados)

**Respuesta**:
```json
{
  "caregivers": [
    {
      "caregiver_id": 2,
      "caregiver_name": "María González",
      "patient_count": 5
    },
    {
      "caregiver_id": 3,
      "caregiver_name": "Carlos López",
      "patient_count": 3
    }
  ]
}
```

**Lógica del backend**:
- Obtener todas las asignaciones activas
- Agrupar por `caregiver_id`
- Para cada cuidador único, obtener su nombre de la tabla `users`
- Contar pacientes asignados
- Ordenar por patient_count descendente

---

### 6. GET `/statistics/admin/users-by-role`
**Propósito**: Obtener cantidad de usuarios activos por rol

**Respuesta**:
```json
{
  "users_by_role": [
    {
      "role": "ADMIN",
      "count": 2
    },
    {
      "role": "ASISTENCIAL",
      "count": 5
    },
    {
      "role": "PERSONAL",
      "count": 10
    }
  ]
}
```

**Lógica del backend**:
- Para cada rol (ADMIN, ASISTENCIAL, PERSONAL), contar usuarios activos
- Retornar array con role y count

---

### 7. GET `/statistics/admin/treatments-status`
**Propósito**: Obtener estado de tratamientos (activos vs inactivos)

**Respuesta**:
```json
{
  "active": 45,
  "inactive": 12
}
```

**Lógica del backend**:
- Obtener todos los pacientes
- Para cada paciente, obtener todos los tratamientos
- Contar tratamientos activos e inactivos
- Retornar totales

---

## Notas de Implementación

1. **Optimización de consultas**: Usar JOINs en SQL para evitar múltiples queries
2. **Caché**: Considerar cachear estos resultados si no cambian frecuentemente
3. **Filtros de fecha**: Usar filtros de fecha en la base de datos en lugar de filtrar en memoria
4. **Paginación**: No es necesaria para estos endpoints ya que son estadísticas agregadas
5. **Ordenamiento**: Hacer el ordenamiento en la base de datos cuando sea posible

## Ejemplo de Estructura en Python (FastAPI)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/statistics/admin", tags=["admin-statistics"])

@router.get("/patients-adherence")
async def get_patients_adherence(db: Session = Depends(get_db)):
    # Implementación aquí
    pass

@router.get("/adherence-trend")
async def get_adherence_trend(db: Session = Depends(get_db)):
    # Implementación aquí
    pass

# ... resto de endpoints
```
