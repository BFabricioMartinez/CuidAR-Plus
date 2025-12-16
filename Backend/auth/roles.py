from typing import List, Union
from fastapi.responses import JSONResponse
from auth.security import Security


def require_roles(headers: dict, allowed_roles: List[str]) -> Union[dict, JSONResponse]:
    """
    Valida el token JWT y verifica que el rol del usuario esté autorizado.

    Esta función combina la autenticación (validación del token) con la autorización
    (verificación del rol). Debe usarse en todos los endpoints que requieran control
    de acceso basado en roles.

    Args:
        headers: Headers de la request (debe contener "authorization")
        allowed_roles: Lista de roles permitidos para acceder al endpoint
                      Ejemplo: ["ADMIN", "ASISTENCIAL"]

    Returns:
        dict: Payload del token si es válido y el rol está autorizado
              Contiene: {"sub": user_id, "email": email, "role": role, ...}
        JSONResponse:
            - 401 si el token es inválido o está expirado
            - 403 si el token es válido pero el rol no está autorizado

    Uso en endpoints:
        payload = require_roles(req.headers, ["ADMIN", "ASISTENCIAL"])
        if isinstance(payload, JSONResponse):
            return payload  # Error 401 o 403

        # Si llegamos aquí, el usuario está autenticado y autorizado
        user_id = payload["sub"]
        user_role = payload["role"]

    Ejemplo:
        @router.get("/users")
        async def get_users(req: Request):
            # Solo ADMIN puede acceder
            payload = require_roles(req.headers, ["ADMIN"])
            if isinstance(payload, JSONResponse):
                return payload

            # Continuar con la lógica del endpoint...
    """
    # 1. Verificar y validar el token
    payload = Security.verify_token(headers)

    # 2. Si el token es inválido, retornar error 401
    if "sub" not in payload:
        # payload contiene el mensaje de error de verify_token
        return JSONResponse(status_code=401, content=payload)

    # 3. Normalizar el rol del usuario a UPPERCASE
    user_role = payload.get("role", "").upper()

    # 4. Normalizar los roles permitidos a UPPERCASE
    normalized_allowed_roles = [role.upper() for role in allowed_roles]

    # 5. Verificar si el rol del usuario está en la lista de roles permitidos
    if user_role not in normalized_allowed_roles:
        return JSONResponse(
            status_code=403,
            content={"message": "Acceso denegado"}
        )

    # 6. Token válido y rol autorizado, retornar payload
    return payload
