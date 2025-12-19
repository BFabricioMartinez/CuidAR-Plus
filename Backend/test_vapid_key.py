"""
Script para verificar que la clave VAPID se carga correctamente desde .env
"""
import os
from dotenv import load_dotenv

# Cargar .env
load_dotenv()

# Leer clave privada tal como está en .env
private_key_raw = os.getenv("VAPID_PRIVATE_KEY", "")
print("=" * 80)
print("CLAVE PRIVADA TAL COMO SE LEE DEL .ENV:")
print("=" * 80)
print(f"Longitud: {len(private_key_raw)} caracteres")
print(f"Primeros 50 caracteres: {private_key_raw[:50]}")
print(f"Últimos 50 caracteres: {private_key_raw[-50:]}")
print()

# Aplicar replace como lo hace push_service.py
private_key_processed = private_key_raw.replace("\\n", "\n")
print("=" * 80)
print("CLAVE PRIVADA DESPUÉS DE REPLACE:")
print("=" * 80)
print(f"Longitud: {len(private_key_processed)} caracteres")
print(private_key_processed)
print()

# Intentar cargarla con cryptography
try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend

    private_key_obj = serialization.load_pem_private_key(
        private_key_processed.encode('utf-8'),
        password=None,
        backend=default_backend()
    )
    print("=" * 80)
    print("✅ ÉXITO: La clave se cargó correctamente!")
    print("=" * 80)
except Exception as e:
    print("=" * 80)
    print("❌ ERROR al cargar la clave:")
    print("=" * 80)
    print(f"{e}")
    import traceback
    traceback.print_exc()
