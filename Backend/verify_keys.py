"""
Script para verificar que las claves VAPID coinciden
"""
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import base64

# Clave privada del backend (con \n literales)
private_key_pem = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgd4jmNBqHQ/pW1yyg\nZSJ9TVKnWguhF4HtH5DwP9QBsUuhRANCAAQd3zqH0Up7GMxlCUA7KsDFnbFGqz5B\n978jEAOgKayCVvxZfLAkZ3ORb/kXNKK8+fw7j+DWwLa6UUQIXrUrWZzU\n-----END PRIVATE KEY-----\n"

# Clave pública del backend
public_key_backend = "BB3fOofRSnsYzGUJQDsqwMWdsUarPkH3vyMQA6AprIJW_Fl8sCRnc5Fv-Rc0orz5_DuP4NbAtrpRRAhetStZnNQ"

# Clave pública del frontend
public_key_frontend = "BB3fOofRSnsYzGUJQDsqwMWdsUarPkH3vyMQA6AprIJW_Fl8sCRnc5Fv-Rc0orz5_DuP4NbAtrpRRAhetStZnNQ"

print("=" * 80)
print("VERIFICACION DE CLAVES VAPID")
print("=" * 80)

# Procesar clave privada (reemplazar \n literales)
private_key_processed = private_key_pem.replace("\\n", "\n").strip()

print("\n1. CARGANDO CLAVE PRIVADA...")
print("-" * 80)
try:
    private_key = serialization.load_pem_private_key(
        private_key_processed.encode('utf-8'),
        password=None,
        backend=default_backend()
    )
    print("[OK] Clave privada cargada correctamente")
except Exception as e:
    print(f"[ERROR] Error al cargar clave privada: {e}")
    exit(1)

print("\n2. DERIVANDO CLAVE PUBLICA DESDE LA PRIVADA...")
print("-" * 80)
try:
    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    derived_public = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
    print(f"[OK] Clave publica derivada: {derived_public}")
except Exception as e:
    print(f"[ERROR] Error al derivar clave publica: {e}")
    exit(1)

print("\n3. COMPARACIONES:")
print("-" * 80)

# Comparar derivada con backend
print(f"\nClave publica BACKEND (.env):")
print(f"  {public_key_backend}")
print(f"\nClave publica DERIVADA (de privada):")
print(f"  {derived_public}")
if derived_public == public_key_backend:
    print("[OK] Las claves BACKEND coinciden!")
else:
    print("[ERROR] Las claves BACKEND NO coinciden!")

# Comparar frontend con backend
print(f"\nClave publica FRONTEND:")
print(f"  {public_key_frontend}")
print(f"\nClave publica BACKEND:")
print(f"  {public_key_backend}")
if public_key_frontend == public_key_backend:
    print("[OK] Las claves FRONTEND y BACKEND coinciden!")
else:
    print("[ERROR] Las claves FRONTEND y BACKEND NO coinciden!")

# Comparar frontend con derivada
print(f"\nClave publica FRONTEND:")
print(f"  {public_key_frontend}")
print(f"\nClave publica DERIVADA:")
print(f"  {derived_public}")
if public_key_frontend == derived_public:
    print("[OK] Las claves FRONTEND y DERIVADA coinciden!")
else:
    print("[ERROR] Las claves FRONTEND y DERIVADA NO coinciden!")

print("\n" + "=" * 80)
print("RESUMEN:")
print("=" * 80)
if derived_public == public_key_backend == public_key_frontend:
    print("[OK] TODAS LAS CLAVES COINCIDEN")
    print("El problema del BadJwtToken NO es por claves que no coinciden.")
    print("Posibles causas:")
    print("  1. Las suscripciones fueron creadas con una clave publica diferente")
    print("  2. Problema con el formato del JWT o los claims")
    print("  3. Problema con el objeto Vapid o pywebpush")
else:
    print("[ERROR] HAY INCONSISTENCIAS EN LAS CLAVES")
    print("Esto causara BadJwtToken. Regenera las claves y actualiza todo.")
print("=" * 80)
