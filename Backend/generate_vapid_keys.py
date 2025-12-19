"""
Script para generar claves VAPID (Voluntary Application Server Identification)
Ejecutar una sola vez para obtener las claves y agregarlas al .env
"""

try:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    import base64

    print("Generando claves VAPID...")

    # Generar clave privada usando SECP256R1 (P-256)
    private_key = ec.generate_private_key(ec.SECP256R1())

    # Serializar clave privada a PEM
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    # Obtener clave pública
    public_key = private_key.public_key()

    # Serializar clave pública a formato base64 URL-safe sin padding
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    public_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').rstrip('=')

    print("=" * 80)
    print("CLAVES VAPID GENERADAS")
    print("=" * 80)
    print("\nAgrega estas lineas a tu archivo .env:\n")
    print(f'VAPID_PRIVATE_KEY="{private_pem}"')
    print(f'VAPID_PUBLIC_KEY={public_b64}')
    print('VAPID_EMAIL=tu@email.com  # Cambia esto por tu email (sin mailto:)')
    print("\n" + "=" * 80)
    print("\nIMPORTANTE:")
    print("1. Copia la VAPID_PUBLIC_KEY al frontend (sera visible publicamente)")
    print("2. NUNCA compartas la VAPID_PRIVATE_KEY (guardala solo en backend)")
    print("3. Cambia el email por uno real")
    print("4. La clave privada debe estar entre comillas dobles en el .env")
    print("=" * 80)

    print("\nClaves generadas exitosamente!")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nAsegurate de tener instalado:")
    print("pip install pywebpush==2.1.2")
