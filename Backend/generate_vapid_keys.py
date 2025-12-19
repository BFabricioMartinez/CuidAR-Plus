"""
Script para generar claves VAPID (Voluntary Application Server Identification)
Ejecutar una sola vez para obtener las claves y agregarlas al .env
"""

from py_vapid import Vapid
import base64
import os

# Genera las claves VAPID
try:
    print("Generando claves VAPID...")

    vapid = Vapid()
    vapid.generate_keys()

    # Guardar las claves en archivos temporales
    vapid.save_key('private_vapid.pem')
    vapid.save_public_key('public_vapid.pem')

    # Leer clave privada (formato PEM completo)
    with open('private_vapid.pem', 'r') as f:
        private_key_pem = f.read().strip()

    # Leer clave pública (formato base64 URL-safe)
    with open('public_vapid.pem', 'r') as f:
        public_key_b64 = f.read().strip()

    print("=" * 80)
    print("CLAVES VAPID GENERADAS")
    print("=" * 80)
    print("\nAgrega estas líneas a tu archivo .env:\n")
    print(f"VAPID_PRIVATE_KEY={private_key_pem}")
    print(f"VAPID_PUBLIC_KEY={public_key_b64}")
    print('VAPID_EMAIL=mailto:tu@email.com  # Cambia esto por tu email')
    print("\n" + "=" * 80)
    print("\n⚠️  IMPORTANTE:")
    print("1. Copia la VAPID_PUBLIC_KEY al frontend (será visible públicamente)")
    print("2. NUNCA compartas la VAPID_PRIVATE_KEY (guárdala solo en backend)")
    print("3. Cambia el email por uno real")
    print("=" * 80)

    # Limpiar archivos temporales
    os.remove('private_vapid.pem')
    os.remove('public_vapid.pem')

    print("\n✅ Claves generadas exitosamente!")

except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nAsegúrate de tener instalado:")
    print("pip install pywebpush APScheduler")
