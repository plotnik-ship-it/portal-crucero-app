# 🚀 Setup Completo - Portal de Crucero

## Configuración en 10 Minutos

Sigue estos pasos exactamente en orden para tener el portal funcionando end-to-end.

---

## PARTE 1: Firebase (5 minutos)

### Paso 1.1: Crear Proyecto Firebase

1. Ir a https://console.firebase.google.com/
2. Click "Agregar proyecto"
3. Nombre: `portal-crucero` (o el que prefieras)
4. Deshabilitar Google Analytics (opcional)
5. Click "Crear proyecto"

### Paso 1.2: Habilitar Authentication

1. En el menú lateral → **Authentication**
2. Click "Comenzar"
3. Tab "Sign-in method"
4. Click "Correo electrónico/contraseña"
5. **Habilitar** el primer switch (Email/Password)
6. Click "Guardar"

### Paso 1.3: Crear Firestore Database

1. En el menú lateral → **Firestore Database**
2. Click "Crear base de datos"
3. Seleccionar "Iniciar en **modo de producción**"
4. Elegir ubicación: `us-central` (o la más cercana)
5. Click "Habilitar"

### Paso 1.4: Obtener Credenciales del Proyecto

1. En el menú lateral → ⚙️ **Configuración del proyecto**
2. Scroll down hasta "Tus apps"
3. Click en el ícono **</>** (Web)
4. Nombre de la app: `Portal Crucero Web`
5. **NO** marcar "Firebase Hosting"
6. Click "Registrar app"
7. **COPIAR** el objeto `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "portal-crucero-xxxxx.firebaseapp.com",
  projectId: "portal-crucero-xxxxx",
  storageBucket: "portal-crucero-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

### Paso 1.5: Crear Service Account Key (para scripts)

1. En **Configuración del proyecto** → Tab "Cuentas de servicio"
2. Click "Generar nueva clave privada"
3. Click "Generar clave"
4. Se descargará un archivo JSON
5. **Renombrar** el archivo a `serviceAccountKey.json`
6. **Mover** el archivo a la raíz del proyecto: `c:\Users\plotn\Shcmal-Group\portal-crucero\serviceAccountKey.json`

⚠️ **IMPORTANTE**: Este archivo contiene credenciales sensibles. Ya está en `.gitignore`.

---

## PARTE 2: Variables de Entorno (1 minuto)

### Paso 2.1: Crear archivo .env

En la raíz del proyecto, crear archivo `.env` con este contenido:

```env
# Firebase Configuration (copiar de firebaseConfig)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=portal-crucero-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=portal-crucero-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=portal-crucero-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...

# EmailJS Configuration (completar después)
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=

# Admin Email
VITE_ADMIN_EMAIL=dplotnik@trevello.com
```

**Reemplazar** los valores de Firebase con los que copiaste en el paso 1.4.

---

## PARTE 3: Poblar Firestore (2 minutos)

### Paso 3.1: Ejecutar Script de Seed

```bash
cd c:\Users\plotn\Shcmal-Group\portal-crucero
node scripts/seedFirestore.js
```

**Salida esperada:**
```
🌱 Starting database seed...

Creating group...
✓ Group created

Creating 27 families...
✓ 27 families created

✅ Database seeded successfully!
```

### Paso 3.2: Crear Usuarios

```bash
node scripts/createUsers.js
```

**Salida esperada:**
```
👥 Creating users for Portal de Crucero

Creating admin user...
✓ Admin user created: admin@trevelo.com
  UID: abc123...
✓ Admin user document created

Creating family users...
✓ Created: FAM001 (fam001@example.com)
...
✓ Created: FAM027 (fam027@example.com)

✅ All users created successfully!
```

### Paso 3.3: Desplegar Security Rules

```bash
# Opción A: Copiar manualmente
```

1. Abrir `firestore.rules`
2. Copiar todo el contenido
3. Ir a Firebase Console → Firestore Database → **Reglas**
4. Pegar el contenido
5. Click "Publicar"

```bash
# Opción B: Usar Firebase CLI (si está instalado)
firebase deploy --only firestore:rules
```

---

## PARTE 4: EmailJS (2 minutos)

### Paso 4.1: Crear Cuenta EmailJS

1. Ir a https://www.emailjs.com/
2. Click "Sign Up" (es gratis)
3. Confirmar email

### Paso 4.2: Conectar Servicio de Email

1. En dashboard → Click "Add New Service"
2. Seleccionar **Gmail** (recomendado)
3. Click "Connect Account"
4. Autorizar con tu cuenta Gmail
5. **COPIAR** el **Service ID** (ej: `service_abc123`)

### Paso 4.3: Crear Template de Email

1. En dashboard → Click "Email Templates"
2. Click "Create New Template"
3. **Template Name**: `payment_request_notification`
4. **Pegar este contenido**:

```
Subject: Nueva Solicitud de Adelanto - {{familyName}}

Hola,

Has recibido una nueva solicitud de adelanto de pago:

INFORMACIÓN DE LA FAMILIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Familia: {{familyName}}
Código: {{familyCode}}
Cabina(s): {{cabinNumbers}}

DETALLES DEL PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monto solicitado: ${{amountCad}} CAD
Equivalente aproximado: ${{amountMxn}} MXN
Tasa de cambio usada: {{fxRate}}

INFORMACIÓN DE TARJETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tarjeta: {{cardBrand}} **** {{cardLast4}}
Titular: {{cardholderName}}

Fecha de solicitud: {{createdAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACCIONES REQUERIDAS:
1. Contactar a la familia para confirmar el pago
2. Procesar el cargo con la naviera
3. Marcar la solicitud como "Aplicada" en el panel de admin

Acceder al panel: {{adminLink}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE: Este es solo una solicitud de pago.
NO se ha procesado ningún cargo automáticamente.

Portal de Crucero - Trevelo
```

5. En "Settings" del template:
   - **To Email**: `{{to_email}}`
   - **From Name**: `Portal de Crucero`
   - **Reply To**: `dplotnik@trevelo.com`

6. Click "Save"
7. **COPIAR** el **Template ID** (ej: `template_xyz789`)

### Paso 4.4: Obtener Public Key

1. En dashboard → Click en tu nombre (arriba derecha)
2. Click "Account"
3. Tab "General"
4. **COPIAR** el **Public Key** (ej: `abc123xyz789`)

### Paso 4.5: Actualizar .env

Editar `.env` y completar:

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=abc123xyz789
```

---

## PARTE 5: Probar la Aplicación (5 minutos)

### Paso 5.1: Reiniciar Servidor

```bash
# Detener el servidor actual (Ctrl+C)
npm run dev
```

### Paso 5.2: Abrir en Navegador

Ir a: http://localhost:5173

### Paso 5.3: Login como Admin

```
Email: admin@trevelo.com
Password: Crucero2026!
```

**Verificar:**
- ✅ Ves el panel de admin
- ✅ Ves 27 familias en la lista
- ✅ Puedes buscar familias
- ✅ Puedes ver detalle de una familia
- ✅ Puedes configurar tipo de cambio

### Paso 5.4: Login como Familia

Cerrar sesión y login con:

```
Email: fam001@example.com
Password: Crucero2026!
```

**Verificar:**
- ✅ Ves información de tu cabina
- ✅ Ves desglose de costos en CAD
- ✅ Ves conversión aproximada a MXN
- ✅ Ves el itinerario
- ✅ Puedes hacer click en "Realizar Adelanto"

### Paso 5.5: Probar Solicitud de Pago

1. Click "Realizar Adelanto"
2. Ingresar monto: `500`
3. Ver conversión automática a MXN
4. Llenar datos de tarjeta:
   - Número: `4532 1234 5678 9010` (Visa de prueba)
   - Nombre: `JUAN PEREZ`
   - Vencimiento: `12/28`
   - CVV: `123`
5. Marcar checkbox de autorización
6. Click "Enviar Solicitud"

**Verificar:**
- ✅ Mensaje de confirmación aparece
- ✅ Email llega a `dplotnik@trevelo.com`
- ✅ Email contiene solo últimos 4 dígitos (9010)
- ✅ Email NO contiene número completo ni CVV

### Paso 5.6: Aprobar Solicitud (como Admin)

1. Cerrar sesión
2. Login como admin
3. Ir a tab "Solicitudes"
4. Ver la solicitud pendiente
5. Click "✓ Aplicar"
6. Confirmar

**Verificar:**
- ✅ Solicitud desaparece de pendientes
- ✅ Se crea registro de pago
- ✅ Saldo de familia se actualiza

---

## ✅ Checklist de Verificación

### Firebase
- [ ] Proyecto creado
- [ ] Authentication habilitado (Email/Password)
- [ ] Firestore creado (modo producción)
- [ ] Credenciales copiadas a `.env`
- [ ] Service Account Key descargado
- [ ] Security Rules desplegadas

### Base de Datos
- [ ] Script `seedFirestore.js` ejecutado
- [ ] 1 grupo creado en Firestore
- [ ] 27 familias creadas en Firestore
- [ ] Script `createUsers.js` ejecutado
- [ ] Usuario admin creado
- [ ] 27 usuarios de familia creados
- [ ] Documentos en colección `users` creados

### EmailJS
- [ ] Cuenta creada
- [ ] Servicio de Gmail conectado
- [ ] Template creado con variables correctas
- [ ] Service ID, Template ID y Public Key copiados a `.env`

### Aplicación
- [ ] Servidor corriendo sin errores
- [ ] Login como admin funciona
- [ ] Panel de admin muestra 27 familias
- [ ] Login como familia funciona
- [ ] Dashboard de familia muestra datos
- [ ] Conversión CAD → MXN funciona
- [ ] Formulario de pago valida tarjeta
- [ ] Email de notificación llega
- [ ] Admin puede aprobar solicitudes

---

## 🔒 Seguridad Verificada

- ✅ Familia NO puede ver datos de otras familias
- ✅ Familia NO puede modificar su saldo
- ✅ Familia puede crear payment requests
- ✅ Familia NO puede modificar payment requests
- ✅ Solo se guardan últimos 4 dígitos de tarjeta
- ✅ CVV NO se guarda en ningún lado
- ✅ Email solo contiene últimos 4 dígitos
- ✅ Admin tiene acceso completo

---

## 🐛 Troubleshooting

### Error: "Firebase: Error (auth/invalid-api-key)"
**Solución**: Verificar que `.env` tiene las credenciales correctas y reiniciar servidor

### Error: "Missing or insufficient permissions"
**Solución**: Desplegar Security Rules en Firebase Console

### Error: "Cannot find module 'serviceAccountKey.json'"
**Solución**: Descargar Service Account Key y ponerlo en la raíz del proyecto

### Email no llega
**Solución**: 
1. Verificar credenciales de EmailJS en `.env`
2. Verificar que el template existe
3. Revisar consola del navegador para errores
4. Verificar spam/correo no deseado

### Login no funciona
**Solución**: Verificar que `createUsers.js` se ejecutó correctamente

---

## 📝 Credenciales de Prueba

```
ADMIN:
Email: admin@trevelo.com
Password: Crucero2026!

FAMILIAS (todas con misma contraseña):
fam001@example.com / Crucero2026!
fam002@example.com / Crucero2026!
fam003@example.com / Crucero2026!
...
fam027@example.com / Crucero2026!
```

⚠️ **Cambiar contraseñas en producción!**

---

## 🎉 ¡Listo!

Tu portal de crucero está completamente configurado y funcionando.

**Próximos pasos:**
1. Cambiar contraseñas de usuarios
2. Personalizar emails de las familias
3. Ajustar datos de costos según sea necesario
4. Configurar dominio personalizado (opcional)
5. Deploy a producción con Firebase Hosting

**Soporte:** dplotnik@trevelo.com
