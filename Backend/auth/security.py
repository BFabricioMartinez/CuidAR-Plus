from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer


# Configuracion JWT
SECRET_KEY = "tu_clave_secreta_muy_segura_cambiar_en_produccion"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Contexto para hashear contraseña
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Verificar si la password coincide con el hash
def verify_password(plain_password: str, hashed_password: str) -> bool:

    return pwd_context.verify(plain_password, hashed_password)

# Hashear una contraseña
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Crear un token JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt

# Clase Security siguiendo el patrón del proyecto anterior
class Security:
    """
    Clase para manejo de seguridad y validación de tokens.
    Sigue el patrón del proyecto anterior (sistema Escuela).
    """
    secret = SECRET_KEY

    @classmethod
    def verify_token(cls, headers: dict) -> dict:
        """
        Verifica y valida el token JWT desde los headers de la request.
        Retorna el payload del token si es válido, o un dict de error si no lo es.

        Args:
            headers: Headers de la request (debe contener "authorization")

        Returns:
            dict: Payload del token con "sub", "exp", "email", "role"
                  O dict con mensaje de error si falla

        Uso en endpoints:
            has_access = Security.verify_token(req.headers)
            if "sub" not in has_access:
                return JSONResponse(status_code=401, content=has_access)
        """
        # Verificar que exista el header authorization
        if "authorization" not in headers:
            return {"message": "Authorization header faltante", "detail": "No se envió el token de autorización"}

        try:
            # Extraer el token (formato: "Bearer TOKEN")
            auth_header = headers["authorization"]
            if not auth_header.startswith("Bearer "):
                return {"message": "Formato de token inválido", "detail": "El token debe tener formato 'Bearer TOKEN'"}

            token = auth_header.split(" ")[1]

            # Decodificar y validar el token
            payload = jwt.decode(token, cls.secret, algorithms=[ALGORITHM])

            # Retornar el payload completo
            return payload

        except jwt.ExpiredSignatureError:
            return {"message": "Token expirado", "detail": "El token ha expirado, por favor inicia sesión nuevamente"}

        except jwt.InvalidSignatureError:
            return {"message": "Firma de token inválida", "detail": "El token ha sido modificado o es inválido"}

        except jwt.DecodeError:
            return {"message": "Token inválido", "detail": "No se pudo decodificar el token"}

        except IndexError:
            return {"message": "Formato de token inválido", "detail": "El token no tiene el formato correcto"}

        except Exception as e:
            return {"message": "Error al verificar token", "detail": str(e)}
