CuidAR+ (MVP v1.0)
"Tu salud, siempre a tu lado"

README.txt


1. GUIA DE INSTALACION (EJECUCION LOCAL)

1.1 Requisitos previos
- PostgreSQL (base de datos).
- Python 3.11+ (recomendado 3.12) para el Backend.
- Node.js 18+ (incluye npm) para el Frontend.

Recomendado para desarrollo:
- Git (opcional, si se clona desde repositorio).
- Un cliente para PostgreSQL (pgAdmin) o acceso por consola (psql).


1.2 Obtener el proyecto
Opcion A (ZIP):
- Descargar y descomprimir el proyecto.
- La raiz contiene dos carpetas principales: Backend/ y Frontend/

Opcion B (Git):
- Clonar el repositorio y ubicarse en la raiz del proyecto.

NOTA IMPORTANTE: Agregar al proyecto archivo para conexion a base de datos excluido del repositorio:

Dentro de BackEnd/:

1) Agregar una nueva carpeta llamada config/.
2) Agregar un archivo llamado db.py con este codigo dentro:

""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Configuración de base de datos
DB_USER = "postgres"
DB_PASSWORD = "**tucontraseña**"
DB_HOST = "localhost"
DB_PORT = "*tu puerto* ----"
DB_NAME = "Cuidar"

# URL de conexión síncrona
SYNC_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# URL de conexión asíncrona (con driver asyncpg)
ASYNC_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Motor síncrono (para uso tradicional)
engine = create_engine(
    SYNC_DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=10,
    pool_recycle=1800,
    echo=False
)

# Motor asíncrono
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=10,
    pool_recycle=1800,
    echo=False
)

# Session síncrona
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

# Session asíncrona
AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base para los modelos
Base = declarative_base()

""



1.3 Base de datos (PostgreSQL)
1) Levantar PostgreSQL y asegurarse de tener un usuario con permisos.
2) Crear la base de datos (por defecto, el proyecto apunta a "Cuidar"):

   CREATE DATABASE "Cuidar";

3) Configurar credenciales de conexion.
   En este MVP, la conexion se configura en:
   Backend/config/db.py

   Editar:
   - DB_USER
   - DB_PASSWORD
   - DB_HOST
   - DB_PORT
   - DB_NAME

Notas importantes:
- En un escenario real, NO se recomienda hardcodear credenciales ni SECRET_KEY en el codigo.
- Para una instalacion “real”, se recomienda migrar a variables de entorno (.env) y excluirlo del repositorio.


1.4 Backend (FastAPI)
1) Abrir una terminal y ubicarse en la carpeta Backend:

   cd Backend

2) Crear y activar un entorno virtual:

   Windows (PowerShell):
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   Linux/Mac:
   python3 -m venv .venv
   source .venv/bin/activate

3) Instalar dependencias (comando sugerido si no existe requirements.txt en el proyecto):

   pip install -U pip
   pip install fastapi uvicorn sqlalchemy asyncpg pydantic python-jose passlib[bcrypt] email_validator

   Opcional (segun entorno):
   pip install psycopg2-binary

4) Ejecutar el servidor:

   uvicorn app:cuidar --reload

5) Verificacion:
- API: http://localhost:8000
- Documentacion Swagger: http://localhost:8000/docs

Notas:
- Al iniciar la app, el Backend crea las tablas automaticamente (Base.metadata.create_all).
- Si la base de datos no existe o las credenciales son incorrectas, el servidor fallara al conectarse.


1.5 Frontend (React + Vite)
1) Abrir OTRA terminal y ubicarse en la carpeta Frontend:

   cd Frontend

2) Instalar dependencias:

   npm install

3) Configurar la URL de la API (si hace falta):
- Archivo: Frontend/src/api/client.ts
- Variable: API_BASE_URL (por defecto: http://localhost:8000)

4) Ejecutar el frontend en modo desarrollo:

   npm run dev

5) Abrir en el navegador:
- Vite normalmente usa http://localhost:5173
- Si ese puerto esta ocupado, usar la URL que indique la consola.


1.6 Primer uso (flujo basico)
1) Registrarse o iniciar sesion.
- Endpoint de registro: POST /auth/signup
- Endpoint de login:   POST /auth/login

2) Ingresar al panel correspondiente segun rol:
- ADMIN / ASISTENCIAL / PERSONAL

3) Flujo sugerido para probar el MVP:
- ADMIN: crear usuarios, pacientes, asignaciones (cuidador-paciente) y revisar estadisticas.
- ASISTENCIAL: ver pacientes asignados, gestionar tratamientos, registrar tomas (TAKEN / MISSED).
- PERSONAL: autogestion de su propia medicacion, registro de tomas y estadisticas personales.


1.7 Problemas comunes (soluciones rapidas)
- “Connection refused” / error de DB:
  - Verificar que PostgreSQL este levantado.
  - Verificar DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME en Backend/config/db.py
  - Verificar que la base “Cuidar” exista.

- El Frontend no se comunica con el Backend:
  - Verificar que el Backend este en http://localhost:8000
  - Revisar API_BASE_URL en Frontend/src/api/client.ts

- Puerto ocupado:
  - Cambiar el puerto de Uvicorn: uvicorn app:cuidar --reload --port 8001
  - Ajustar API_BASE_URL en el Frontend en consecuencia.


2. SOBRE EL PROYECTO

2.1 Descripcion
CuidAR+ es una aplicacion web orientada al control, registro y seguimiento de medicacion en contextos
personales, asistenciales y administrativos, con enfoque en la organizacion segura de tratamientos y el seguimiento
de adherencia (tomas realizadas u omitidas).

2.2 Alcance del MVP v1.0 (funcionalidades principales)
- Gestion de usuarios con roles diferenciados (ADMIN, ASISTENCIAL, PERSONAL).
- Autenticacion con token JWT (Bearer) y control de acceso por rol (RBAC).
- Gestion de pacientes (alta, baja logica, modificacion y consulta).
- Asignacion cuidador-paciente (assignments) con estado activo.
- Gestion de tratamientos (medicacion, dosis, frecuencia, notas, vigencia, active).
- Registro de tomas (intake_logs) con estado (TAKEN / MISSED) y trazabilidad temporal.
- Paneles por rol en SPA (React) con navegacion por rutas.
- Dashboard con metricas y graficos (Chart.js).
- Listados con filtros y paginacion tipo keyset (endpoints /paginated).

2.3 Fuera de alcance (en esta version)
- Notificaciones push nativas y alarmas automaticas.
- Implementacion PWA completa (offline robusto).
- Exportacion de reportes PDF/CSV.
- Auditoria avanzada (historico de cambios extendido).


3. ROLES DEL SISTEMA
- ADMIN:
  Control total del sistema. Gestion de usuarios, pacientes, asignaciones y reportes/estadisticas.

- ASISTENCIAL:
  Cuidador con pacientes asignados. Registra tomas y visualiza metricas de pacientes bajo su responsabilidad.

- PERSONAL:
  Usuario individual que administra su propia medicacion y visualiza su historial y metricas personales.


4. ARQUITECTURA Y TECNOLOGIAS

4.1 Arquitectura (3 capas)
- Cliente (SPA): React + TypeScript + Vite.
  UI responsive con Tailwind CSS y Bootstrap. Graficos con Chart.js (react-chartjs-2).

- API (Backend): FastAPI (Python) con routers por modulo, SQLAlchemy y sesiones asincronas.
  Autenticacion JWT y RBAC por rol en endpoints.

- Base de datos: PostgreSQL.

4.2 Estructura general del repositorio
Backend/
  app.py
  auth/
  config/
  models/
  routes/
  utils/

Frontend/
  package.json
  vite.config.ts
  src/
    api/
    components/
    hooks/
    types/
    views/


5. MODELO DE DATOS (RESUMEN)
- users
- patients
- assignments (relacion cuidador–paciente)
- treatments (asociados a patients)
- intake_logs (registros de tomas TAKEN / MISSED)

Nota: el campo "active" se utiliza para baja logica en entidades de gestion.


6. ENDPOINTS PRINCIPALES (RESUMEN)
Auth
- POST /auth/signup
- POST /auth/login
- GET  /auth/me

Users
- POST /user/paginated
- GET  /user/{user_id}
- PUT  /user/update
- PUT  /user/{user_id}/deactivate
- GET  /user/role/{role}

Patients
- POST /patient/paginated
- GET  /patient/{patient_id}
- POST /patient/create
- PUT  /patient/update
- PUT  /patient/{patient_id}/deactivate

Assignments
- POST /assignment/paginated
- GET  /assignment/{assignment_id}
- POST /assignment/create
- PUT  /assignment/update
- PUT  /assignment/{assignment_id}/deactivate

Treatments
- POST /treatment/paginated
- GET  /treatment/{treatment_id}
- POST /treatment/create
- PUT  /treatment/update
- PUT  /treatment/{treatment_id}/deactivate
- GET  /treatment/patient/{patient_id}

Intake (tomas)
- POST /intake/paginated
- GET  /intake/{intake_id}
- POST /intake/create
- PUT  /intake/update
- GET  /intake/treatment/{treatment_id}
- GET  /intake/patient/{patient_id}/history
- POST /intake/mark-taken
- POST /intake/mark-missed

Statistics
- GET /statistics/overview
- GET /statistics/my-stats


7. SEGURIDAD (RESUMEN)
- JWT Bearer Token con expiracion.
- RBAC: el Backend valida JWT, extrae el rol y permite/deniega segun roles permitidos.
- Contraseñas hasheadas (bcrypt).

Recomendaciones para instalacion real:
- Cambiar SECRET_KEY y no versionarlo.
- Migrar credenciales/secretos a variables de entorno.
- Configurar CORS con allow_origins especificos en produccion.
- Usar HTTPS en despliegues reales y rotacion de tokens/secretos segun politicas.


8. LICENCIAS Y COMPONENTES DE TERCEROS (RESUMEN)
Backend:
- Python (PSF)
- FastAPI (MIT)
- Uvicorn (BSD-3-Clause)
- SQLAlchemy (MIT)
- asyncpg (Apache-2.0)
- Pydantic (MIT)
- python-jose (MIT)
- passlib (BSD)
- bcrypt (Apache-2.0)

Frontend:
- React / React DOM (MIT)
- React Router DOM (MIT)
- Vite (MIT)
- TypeScript (Apache-2.0)
- Tailwind CSS (MIT)
- Bootstrap (MIT)
- Chart.js (MIT)
- react-chartjs-2 (MIT)
- react-hot-toast (MIT)
- react-select (MIT)
- @tanstack/react-table (MIT)
- jwt-decode (MIT)
- lucide-react (MIT)

Base de datos:
- PostgreSQL (PostgreSQL License)

Nota: el detalle de versiones queda respaldado en Frontend/package.json y en la definicion de dependencias del backend.


9. EQUIPO
Proyecto desarrollado por:
- Fabricio Martinez
- Juan Olivera
- Bautista Olivera


10. NOTAS
- Para demostraciones/documentacion se recomienda utilizar datos ficticios (no usar informacion personal real).

