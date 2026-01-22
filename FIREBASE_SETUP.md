# 🔥 Guía Paso a Paso - Configuración de Firebase

## ⏱️ Tiempo estimado: 10 minutos

Sigue estos pasos **exactamente en orden** para configurar Firebase y tener el portal funcionando.

---

## PASO 1: Crear Proyecto Firebase (2 minutos)

### 1.1 Ir a Firebase Console

Abrir en tu navegador: **https://console.firebase.google.com/**

### 1.2 Crear Nuevo Proyecto

1. Click en **"Agregar proyecto"** o **"Create a project"**
2. **Nombre del proyecto**: `portal-crucero` (o el nombre que prefieras)
3. Click **"Continuar"**
4. **Google Analytics**: Puedes deshabilitarlo (no es necesario)
5. Click **"Crear proyecto"**
6. Esperar 30-60 segundos mientras se crea
7. Click **"Continuar"** cuando esté listo

✅ **Resultado**: Deberías estar en el dashboard del proyecto

---

## PASO 2: Habilitar Authentication (1 minuto)

### 2.1 Ir a Authentication

1. En el menú lateral izquierdo, buscar **"Authentication"**
2. Click en **"Authentication"**

### 2.2 Comenzar

1. Click en el botón **"Get started"** o **"Comenzar"**

### 2.3 Habilitar Email/Password

1. En la pestaña **"Sign-in method"**
2. Buscar **"Email/Password"** en la lista
3. Click en **"Email/Password"**
4. **Habilitar** el primer switch (Email/Password)
   - ⚠️ NO habilitar "Email link (passwordless sign-in)"
5. Click **"Save"** o **"Guardar"**

✅ **Resultado**: Email/Password debe aparecer como "Enabled" en la lista

---

## PASO 3: Crear Firestore Database (2 minutos)

### 3.1 Ir a Firestore

1. En el menú lateral izquierdo, buscar **"Firestore Database"**
2. Click en **"Firestore Database"**

### 3.2 Crear Base de Datos

1. Click en **"Create database"** o **"Crear base de datos"**

### 3.3 Configurar Seguridad

1. Seleccionar **"Start in production mode"** (modo producción)
   - ⚠️ Es importante seleccionar "production mode"
2. Click **"Next"** o **"Siguiente"**

### 3.4 Seleccionar Ubicación

1. Elegir ubicación más cercana:
   - Para México/USA: `us-central` o `us-east1`
   - Para otros: la más cercana geográficamente
2. Click **"Enable"** o **"Habilitar"**
3. Esperar 30-60 segundos mientras se crea

✅ **Resultado**: Deberías ver la interfaz de Firestore vacía (sin colecciones aún)

---

## PASO 4: Obtener Credenciales del Proyecto (2 minutos)

### 4.1 Ir a Configuración

1. Click en el ícono de **⚙️ engranaje** (arriba izquierda, al lado de "Project Overview")
2. Click en **"Project settings"** o **"Configuración del proyecto"**

### 4.2 Registrar App Web

1. Scroll down hasta la sección **"Your apps"** o **"Tus apps"**
2. Click en el ícono **</>** (Web)
3. **App nickname**: `Portal Crucero Web`
4. **NO** marcar "Also set up Firebase Hosting"
5. Click **"Register app"** o **"Registrar app"**

### 4.3 Copiar Credenciales

Verás un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "portal-crucero-xxxxx.firebaseapp.com",
  projectId: "portal-crucero-xxxxx",
  storageBucket: "portal-crucero-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**COPIAR** todos estos valores. Los necesitarás en el siguiente paso.

4. Click **"Continue to console"**

✅ **Resultado**: Tienes las credenciales copiadas

---

## PASO 5: Crear Service Account Key (1 minuto)

### 5.1 Ir a Service Accounts

1. Todavía en **"Project settings"** (⚙️)
2. Click en la pestaña **"Service accounts"**

### 5.2 Generar Clave

1. Click en **"Generate new private key"** o **"Generar nueva clave privada"**
2. Confirmar en el diálogo: Click **"Generate key"** o **"Generar clave"**
3. Se descargará un archivo JSON automáticamente

### 5.3 Guardar el Archivo

1. **Renombrar** el archivo descargado a: `serviceAccountKey.json`
2. **Mover** el archivo a la raíz de tu proyecto:
   ```
   c:\Users\plotn\Shcmal-Group\portal-crucero\serviceAccountKey.json
   ```

⚠️ **IMPORTANTE**: Este archivo contiene credenciales sensibles. Ya está en `.gitignore` para que no se suba a Git.

✅ **Resultado**: Archivo `serviceAccountKey.json` en la raíz del proyecto

---

## PASO 6: Configurar Variables de Entorno (1 minuto)

### 6.1 Crear archivo .env

En la raíz del proyecto, crear un archivo llamado `.env` (sin extensión, solo `.env`)

### 6.2 Pegar Configuración

Copiar este contenido y **reemplazar** los valores con los que copiaste en el Paso 4:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=portal-crucero-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=portal-crucero-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=portal-crucero-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# EmailJS Configuration (dejar vacío por ahora)
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=

# Admin Email
VITE_ADMIN_EMAIL=dplotnik@trevello.com
```

### 6.3 Guardar

Guardar el archivo `.env`

✅ **Resultado**: Archivo `.env` configurado con credenciales de Firebase

---

## PASO 7: Poblar Base de Datos (1 minuto)

### 7.1 Ejecutar Script de Seed

Abrir terminal en la carpeta del proyecto y ejecutar:

```bash
npm run setup-db
```

**Salida esperada:**
```
🌱 Starting database seed...
✓ Group created
✓ 27 families created

👥 Creating users for Portal de Crucero
✓ Admin user created: admin@trevelo.com
✓ Created: FAM001 (fam001@example.com)
...
✓ Created: FAM027 (fam027@example.com)
✅ All users created successfully!
```

✅ **Resultado**: Base de datos poblada con grupo, 27 familias y usuarios

---

## PASO 8: Desplegar Security Rules (1 minuto)

### 8.1 Copiar Reglas

1. Abrir el archivo `firestore.rules` del proyecto
2. **Copiar TODO** el contenido (Ctrl+A, Ctrl+C)

### 8.2 Pegar en Firebase Console

1. Ir a Firebase Console → **Firestore Database**
2. Click en la pestaña **"Rules"** o **"Reglas"**
3. **Borrar** todo el contenido actual
4. **Pegar** el contenido de `firestore.rules`
5. Click **"Publish"** o **"Publicar"**

✅ **Resultado**: Security Rules desplegadas

---

## PASO 9: Probar la Aplicación (1 minuto)

### 9.1 Iniciar Servidor (si no está corriendo)

```bash
npm run dev
```

### 9.2 Abrir en Navegador

Ir a: **http://localhost:5173**

### 9.3 Login como Admin

```
Email: admin@trevelo.com
Password: AdminCrucero2026!
```

**Verificar:**
- ✅ Login exitoso
- ✅ Ves el panel de admin
- ✅ Ves 27 familias en la lista
- ✅ Puedes buscar familias
- ✅ Puedes ver detalle de una familia

### 9.4 Configurar Password para una Familia (Prueba)

1. Cerrar sesión del admin
2. En la pantalla de login, click **"¿Olvidaste tu contraseña?"**
3. Ingresar: `fam001@example.com`
4. Click **"Enviar Email"**
5. **Ir a Firebase Console** → Authentication → Users
6. Buscar `fam001@example.com`
7. Click en los 3 puntos → **"Reset password"**
8. Copiar el link que aparece
9. Abrir el link en el navegador
10. Establecer password: `MiPassword123!`
11. Volver a http://localhost:5173
12. Login con: `fam001@example.com` / `MiPassword123!`

**Verificar:**
- ✅ Login exitoso
- ✅ Ves dashboard de familia
- ✅ Ves información de cabina
- ✅ Ves desglose de costos
- ✅ Ves conversión a MXN
- ✅ Puedes hacer click en "Realizar Adelanto"

### 9.5 Probar Solicitud de Pago

1. Click **"Realizar Adelanto"**
2. Ingresar monto: `500`
3. Ver conversión automática a MXN
4. Llenar:
   - Nombre del titular: `JUAN PEREZ`
   - Tipo de tarjeta: `Visa` (opcional)
   - Últimos 4 dígitos: `1234` (opcional)
5. Marcar checkbox de autorización
6. Click **"Enviar Solicitud"**

**Verificar:**
- ✅ Mensaje de confirmación aparece
- ✅ NO se solicitó número completo de tarjeta
- ✅ NO se solicitó CVV

---

## ✅ Checklist Final

- [ ] Proyecto Firebase creado
- [ ] Authentication habilitado (Email/Password)
- [ ] Firestore creado (modo producción)
- [ ] Credenciales copiadas a `.env`
- [ ] Service Account Key descargado y guardado
- [ ] Script `npm run setup-db` ejecutado exitosamente
- [ ] Security Rules desplegadas
- [ ] Login como admin funciona
- [ ] Panel de admin muestra 27 familias
- [ ] Password reset para familia funciona
- [ ] Login como familia funciona
- [ ] Dashboard de familia muestra datos
- [ ] Formulario de pago NO solicita tarjeta completa ni CVV

---

## 🎉 ¡Listo!

Tu portal está completamente configurado y funcionando de forma segura.

**Credenciales:**
- Admin: `admin@trevelo.com` / `AdminCrucero2026!`
- Familias: Deben usar "Forgot Password" para establecer su contraseña

**Próximos pasos opcionales:**
1. Configurar EmailJS para notificaciones (ver SETUP.md)
2. Cambiar password del admin
3. Enviar emails de reset password a todas las familias
4. Personalizar datos de familias según sea necesario

**Soporte:** dplotnik@trevelo.com
