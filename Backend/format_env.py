"""
Script para formatear la clave VAPID privada para el archivo .env
Convierte los saltos de línea reales en \n literales
"""

# Clave privada generada (con saltos de línea reales)
private_key_pem = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgd4jmNBqHQ/pW1yyg
ZSJ9TVKnWguhF4HtH5DwP9QBsUuhRANCAAQd3zqH0Up7GMxlCUA7KsDFnbFGqz5B
978jEAOgKayCVvxZfLAkZ3ORb/kXNKK8+fw7j+DWwLa6UUQIXrUrWZzU
-----END PRIVATE KEY-----
"""

# Limpiar espacios al inicio/final
private_key_pem = private_key_pem.strip()

# Convertir saltos de línea reales a \n literales
private_key_escaped = private_key_pem.replace('\n', '\\n')

print("=" * 80)
print("FORMATO CORRECTO PARA .ENV")
print("=" * 80)
print("\nCopia y pega EXACTAMENTE esto en tu archivo .env:\n")
print(f'VAPID_PRIVATE_KEY="{private_key_escaped}"')
print('VAPID_PUBLIC_KEY=BB3fOofRSnsYzGUJQDsqwMWdsUarPkH3vyMQA6AprIJW_Fl8sCRnc5Fv-Rc0orz5_DuP4NbAtrpRRAhetStZnNQ')
print('VAPID_EMAIL=tu@email.com')
print("\n" + "=" * 80)
print("\nNOTA: La clave privada debe estar en UNA SOLA LINEA con \\n literales")
print("=" * 80)
