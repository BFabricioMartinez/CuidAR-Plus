"""
Script para generar claves VAPID (Voluntary Application Server Identification)
Ejecutar una sola vez para obtener las claves y agregarlas al .env
"""

from pywebpush import webpush, WebPushException
import json

# Genera las claves VAPID
try:
    from py_vapid import Vapid

    vapid = Vapid()
    vapid.generate_keys()

    print("=" * 80)
    print("CLAVES VAPID GENERADAS")
    print("=" * 80)
    print("\nAgrega estas líneas a tu archivo .env:\n")
    print(f"VAPID_PRIVATE_KEY={vapid.private_key.to_string().decode('utf-8')}")
    print(f"VAPID_PUBLIC_KEY={vapid.public_key.to_string().decode('utf-8')}")
    print('VAPID_EMAIL=mailto:tu@email.com  # Cambia esto por tu email')
    print("\n" + "=" * 80)
    print("\n⚠️  IMPORTANTE:")
    print("1. Copia la VAPID_PUBLIC_KEY al frontend (será visible públicamente)")
    print("2. NUNCA compartas la VAPID_PRIVATE_KEY (guárdala solo en backend)")
    print("3. Cambia el email por uno real")
    print("=" * 80)

except ImportError:
    print("ERROR: Instala las dependencias primero:")
    print("pip install pywebpush")
