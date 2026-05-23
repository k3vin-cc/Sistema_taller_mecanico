# Taller Autosolution - Don Michel
## Configuración HTTPS con Certificados SSL

### Requisitos
- Python 3.10+
- Librería `cryptography` de Python instalada (incluida en `requirements.txt`)

### HTTPS Habilitado

La aplicación está configurada para usar HTTPS automáticamente si detecta los certificados SSL en la carpeta `aplicacion_maicol/`:
- `cert.pem` - Certificado SSL
- `key.pem` - Clave privada

### Ejecutar la aplicación

#### Opción 1: Con HTTPS (usando certificados incluidos)
```bash
cd aplicacion_maicol
python app.py
```

Luego accede a:
- Desde este dispositivo: `https://localhost:5001`
- Desde otros dispositivos: `https://<IP_LOCAL>:5001`

#### Opción 2: Sin HTTPS (HTTP)
Los certificados se usan automáticamente. Si por alguna razón necesitas ejecutar en HTTP, puedes:
1. Renombrar o mover los archivos `cert.pem` y `key.pem`
2. Ejecutar la aplicación nuevamente

### Advertencia de Certificado

Es normal que los navegadores muestren una advertencia como:
- "Tu conexión no es privada"
- "ERR_CERT_AUTHORITY_INVALID"

Esto ocurre porque el certificado es autofirmado (no emitido por una autoridad certificadora). Es seguro proceder.

**Para Firefox:**
- Haz clic en "Avanzadas" → "Aceptar riesgo y continuar"

**Para Chrome/Edge:**
- Haz clic en "Avanzadas" → "Continuar a localhost"

**Para Safari:**
- Haz clic en "Mostrar detalles" → "Visitar este sitio web"

### Regenerar Certificados (Opcional)

Si necesitas generar nuevos certificados:

```bash
python generar_certificados.py
```

El script te pedirá confirmación si ya existen certificados y los regenerará de manera local utilizando la librería `cryptography` de Python sin requerir ejecutables de OpenSSL del sistema operativo.

### Información de los Certificados

**Certificado Actual:**
- Validez: 365 días
- Algoritmo: RSA 2048 bits
- Tipo: Autofirmado
- Propósito: Desarrollo y testing local

### Acceso desde diferentes dispositivos

Una vez que conozcas tu IP local (mostrada al iniciar la aplicación), puedes acceder desde:

```
https://<IP_LOCAL>:5001
```

Por ejemplo: `https://192.168.1.100:5001`

### Solución de problemas

**Error: "Certificados SSL no encontrados"**
- Verifica que `cert.pem` y `key.pem` existan en `aplicacion_maicol/`
- Si faltan, ejecuta: `python generar_certificados.py`

**La aplicación sigue usando HTTP**
- Asegúrate de que los certificados estén en la carpeta correcta
- Reinicia la aplicación
