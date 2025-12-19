"""
Script de diagnóstico completo para VAPID keys
Este script verifica todos los aspectos de la configuración VAPID
"""
import os
import sys

print("=" * 80)
print("DIAGNOSTICO COMPLETO DE VAPID")
print("=" * 80)

# 1. Verificar variables de entorno
print("\n1. VERIFICANDO VARIABLES DE ENTORNO...")
print("-" * 80)

vapid_private_key_raw = os.getenv("VAPID_PRIVATE_KEY", "")
vapid_public_key = os.getenv("VAPID_PUBLIC_KEY", "")
vapid_email = os.getenv("VAPID_EMAIL", "")

print(f"VAPID_PRIVATE_KEY presente: {bool(vapid_private_key_raw)}")
print(f"VAPID_PUBLIC_KEY presente: {bool(vapid_public_key)}")
print(f"VAPID_EMAIL presente: {bool(vapid_email)}")

if vapid_private_key_raw:
    print(f"Longitud VAPID_PRIVATE_KEY: {len(vapid_private_key_raw)} caracteres")
    print(f"Primeros 50 chars: {repr(vapid_private_key_raw[:50])}")
    print(f"Contiene \\n literales: {'\\n' in vapid_private_key_raw}")
    print(f"Contiene saltos de línea reales: {'\n' in vapid_private_key_raw}")

# 2. Procesar clave privada
print("\n2. PROCESANDO CLAVE PRIVADA...")
print("-" * 80)

vapid_private_processed = vapid_private_key_raw.replace("\\n", "\n").strip()

print(f"Después de replace y strip:")
print(f"Longitud: {len(vapid_private_processed)} caracteres")
print(f"Empieza con BEGIN: {vapid_private_processed.startswith('-----BEGIN')}")
print(f"Termina con END: {vapid_private_processed.endswith('-----')}")

# 3. Intentar cargar con cryptography
print("\n3. VERIFICANDO CON CRYPTOGRAPHY...")
print("-" * 80)

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
    
    private_key_obj = serialization.load_pem_private_key(
        vapid_private_processed.encode('utf-8'),
        password=None,
        backend=default_backend()
    )
    print("✅ Clave privada válida según cryptography")
except Exception as e:
    print(f"❌ ERROR con cryptography: {e}")
    import traceback
    traceback.print_exc()

# 4. Intentar cargar con py_vapid
print("\n4. VERIFICANDO CON PY_VAPID...")
print("-" * 80)

try:
    from py_vapid import Vapid
    
    # Método 1: from_pem con bytes
    try:
        vapid_obj1 = Vapid.from_pem(vapid_private_processed.encode('utf-8'))
        print("✅ Vapid.from_pem(bytes) funcionó")
        
        # Obtener clave PEM desde el objeto
        pem_from_obj = vapid_obj1.private_pem().decode('utf-8')
        print(f"✅ private_pem() funcionó, longitud: {len(pem_from_obj)}")
        
    except Exception as e:
        print(f"❌ Vapid.from_pem(bytes) falló: {e}")
        
    # Método 2: from_pem con string
    try:
        vapid_obj2 = Vapid.from_pem(vapid_private_processed)
        print("✅ Vapid.from_pem(string) funcionó")
    except Exception as e:
        print(f"❌ Vapid.from_pem(string) falló: {e}")
        
except ImportError as e:
    print(f"❌ No se puede importar py_vapid: {e}")
except Exception as e:
    print(f"❌ ERROR con py_vapid: {e}")
    import traceback
    traceback.print_exc()

# 5. Verificar pywebpush
print("\n5. VERIFICANDO PYWEBPUSH...")
print("-" * 80)

try:
    import pywebpush
    print(f"✅ pywebpush instalado, versión: {pywebpush.__version__ if hasattr(pywebpush, '__version__') else 'desconocida'}")
    
    # Verificar qué acepta webpush
    import inspect
    sig = inspect.signature(pywebpush.webpush)
    print(f"Parámetros de webpush: {list(sig.parameters.keys())}")
    
except ImportError as e:
    print(f"❌ No se puede importar pywebpush: {e}")
except Exception as e:
    print(f"❌ ERROR con pywebpush: {e}")

# 6. Probar formato final
print("\n6. FORMATO FINAL PARA WEBPUSH...")
print("-" * 80)

try:
    from py_vapid import Vapid
    
    vapid_obj = Vapid.from_pem(vapid_private_processed.encode('utf-8'))
    final_key = vapid_obj.private_pem().decode('utf-8')
    
    print("✅ Formato final obtenido:")
    print(f"Tipo: {type(vapid_obj)}")
    print(f"Clave PEM desde objeto (primeros 80 chars): {repr(final_key[:80])}")
    
except Exception as e:
    print(f"❌ No se pudo obtener formato final: {e}")

print("\n" + "=" * 80)
print("DIAGNOSTICO COMPLETADO")
print("=" * 80)
