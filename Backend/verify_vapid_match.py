"""
Script para verificar que las claves VAPID del frontend y backend coinciden
"""
import os
from py_vapid import Vapid
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import base64

print("=" * 80)
print("VERIFICACION DE CLAVES VAPID")
print("=" * 80)

# Cargar clave privada del backend
vapid_private_key_raw = os.getenv("VAPID_PRIVATE_KEY", "").replace("\\n", "\n").strip()
vapid_public_key_backend = os.getenv("VAPID_PUBLIC_KEY", "").replace("\\n", "\n").strip()

print("\n1. CLAVE PRIVADA DEL BACKEND:")
print("-" * 80)
if vapid_private_key_raw:
    print(f"[OK] Clave privada presente: {len(vapid_private_key_raw)} caracteres")
    try:
        # Cargar con cryptography
        private_key = serialization.load_pem_private_key(
            vapid_private_key_raw.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        print("[OK] Clave privada valida segun cryptography")
        
        # Obtener clave pública desde la privada
        public_key = private_key.public_key()
        public_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint
        )
        public_b64_from_private = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')
        
        print(f"\nClave pública DERIVADA de la privada:")
        print(f"{public_b64_from_private}")
        
    except Exception as e:
        print(f"[ERROR] Error al cargar clave privada: {e}")
        public_b64_from_private = None
else:
    print("[ERROR] Clave privada no encontrada")
    public_b64_from_private = None

print("\n2. CLAVE PUBLICA EN BACKEND (.env):")
print("-" * 80)
if vapid_public_key_backend:
    print(f"[OK] Clave publica en .env: {vapid_public_key_backend}")
else:
    print("[ERROR] Clave publica no encontrada en .env")

print("\n3. COMPARACION:")
print("-" * 80)
if public_b64_from_private and vapid_public_key_backend:
    if public_b64_from_private == vapid_public_key_backend:
        print("[OK] LAS CLAVES COINCIDEN - La clave publica del .env coincide con la derivada de la privada")
    else:
        print("[ERROR] LAS CLAVES NO COINCIDEN")
        print(f"   Clave publica del .env:     {vapid_public_key_backend}")
        print(f"   Clave publica derivada:     {public_b64_from_private}")
        print("\n[ADVERTENCIA] ESTE ES EL PROBLEMA: La clave publica en el .env no corresponde a la clave privada")
        print("   Solución: Regenera las claves VAPID y actualiza ambas en frontend y backend")
else:
    print("[ADVERTENCIA] No se pudo comparar (falta alguna clave)")

print("\n4. VERIFICAR CLAVE PUBLICA EN FRONTEND:")
print("-" * 80)
print("Busca en el frontend el archivo que contiene VAPID_PUBLIC_KEY")
print("y compara con la clave pública derivada arriba.")
print("Si no coinciden, ese es el problema del BadJwtToken.")

print("\n" + "=" * 80)
print("DIAGNOSTICO COMPLETADO")
print("=" * 80)
