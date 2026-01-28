# Configuración de Firebase Storage para Branding

## Problema

Los errores de CORS que estás viendo ocurren porque Firebase Storage necesita configuración adicional para permitir que tu aplicación local (`localhost:5173`) acceda a las imágenes almacenadas.

## Solución Rápida (Recomendada)

### Opción 1: Configurar CORS desde Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Storage** en el menú lateral
4. Click en la pestaña **Rules**
5. Actualiza las reglas para permitir lectura pública:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir lectura pública de logos de agencias
    match /agencies/{agencyId}/{allPaths=**} {
      allow read: if true;  // Lectura pública
      allow write: if request.auth != null 
                   && request.auth.token.role == 'admin'
                   && request.auth.token.agencyId == agencyId;
    }
  }
}
```

### Opción 2: Configurar CORS con Google Cloud Console

Si necesitas más control sobre CORS:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto de Firebase
3. Ve a **Cloud Storage** → **Browser**
4. Encuentra tu bucket (algo como `your-project.appspot.com`)
5. Click en los 3 puntos → **Edit bucket permissions**
6. Agrega una política CORS

O usa `gsutil` (requiere Google Cloud SDK):

```bash
# Crear archivo cors.json
echo '[
  {
    "origin": ["http://localhost:5173", "http://localhost:5174"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]' > cors.json

# Aplicar configuración
gsutil cors set cors.json gs://your-project.appspot.com
```

## Solución Temporal (Para Desarrollo)

Por ahora, el componente está configurado para:
1. Intentar cargar el logo existente
2. Si falla por CORS, no mostrar error
3. El logo se verá correctamente después de subir uno nuevo

**Puedes continuar trabajando sin configurar CORS** - simplemente:
- Sube un nuevo logo
- Los colores y contacto funcionarán perfectamente
- El logo se verá en la preview después de subirlo

## Verificar Configuración

Después de configurar CORS, verifica:

1. Recarga la página de branding
2. El logo debería cargarse sin errores
3. La consola no debería mostrar errores de CORS

## Notas Importantes

- **Producción:** Agrega tu dominio de producción a las reglas CORS
- **Seguridad:** Las reglas actuales permiten lectura pública pero escritura solo a admins
- **Cache:** Los cambios de CORS pueden tardar unos minutos en aplicarse

## Siguiente Paso

Por ahora puedes:
1. Ignorar el error de CORS del logo existente
2. Subir un nuevo logo (funcionará correctamente)
3. Configurar colores y contacto (funcionan sin problemas)
4. Guardar la configuración

El logo se guardará correctamente y se verá en los PDFs generados.
