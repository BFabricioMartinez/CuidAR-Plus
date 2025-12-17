from enum import Enum

def is_valid_change(new_value, current_value) -> bool:
    """
    Valida si un cambio es válido para actualizar un campo.
    Retorna False si el nuevo valor es None, vacío, o igual al valor actual.

    Args:
        new_value: Nuevo valor a asignar
        current_value: Valor actual del campo

    Returns:
        bool: True si el cambio es válido, False si no

    Uso:
        if is_valid_change(data.name, entity.name):
            entity.name = data.name
            updated = True
    """
    # Si el nuevo valor es None, no hay cambio
    if new_value is None:
        return False

    # Manejar Enums
    if isinstance(new_value, Enum):
        return new_value != current_value

    # Manejar strings
    if isinstance(new_value, str):
        stripped = new_value.strip().lower()
        # Rechazar strings vacíos o "undefined"
        if stripped == "" or stripped == "undefined":
            return False
        # Comparar con el valor actual (case-insensitive)
        return stripped != str(current_value).strip().lower()

    # Manejar integers
    if isinstance(new_value, int):
        # Rechazar 0 como cambio (puede ser intencional, ajustar según necesidad)
        if new_value == 0:
            return False
        return new_value != current_value

    # Manejar booleans explícitamente
    if isinstance(new_value, bool):
        return new_value != current_value

    # Caso general: comparación directa
    return new_value != current_value
