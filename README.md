# Portal de Crucero

Portal seguro para que 27 familias accedan a información de sus cabinas de crucero y realicen solicitudes de adelanto de pago.

## 🚀 Características

- ✅ Autenticación con Firebase (email/password)
- ✅ Roles: Familia y Administrador
- ✅ Dashboard de familia con información de cabina, costos, e itinerario
- ✅ Conversión de moneda CAD a MXN (configurable)
- ✅ Solicitud de adelanto de pago (captura de intención, sin procesamiento real)
- ✅ Manejo seguro de datos de tarjeta (solo últimos 4 dígitos, sin CVV)
- ✅ Notificaciones por email al administrador
- ✅ Panel de administración para gestionar familias y solicitudes
- ✅ Firestore Security Rules estrictas
- ✅ Diseño responsive (mobile-first)

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Firebase (plan Spark o superior)
- Cuenta de EmailJS (gratuita)

## 🛠️ Configuración

### 1. Clonar e Instalar Dependencias

```bash
cd portal-crucero
npm install
```

### 2. Configurar Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar **Authentication** → Email/Password
3. Habilitar **Cloud Firestore**
4. Copiar las credenciales del proyecto

### 3. Configurar EmailJS

1. Crear cuenta en [EmailJS](https://www.emailjs.com/)
2. Crear un servicio de email (Gmail, Outlook, etc.)
3. Crear un template con las siguientes variables:
   - `to_email`
   - `family_name`
   - `family_code`
   - `cabin_numbers`
   - `amount_cad`
   - `amount_mxn`
   - `fx_rate`
   - `card_brand`
   - `card_last4`
   - `cardholder_name`
   - `timestamp`
   - `admin_link`

### 4. Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id

VITE_EMAILJS_SERVICE_ID=tu_service_id
VITE_EMAILJS_TEMPLATE_ID=tu_template_id
VITE_EMAILJS_PUBLIC_KEY=tu_public_key

VITE_ADMIN_EMAIL=dplotnik@trevelo.com
```

### 5. Configurar Firestore Security Rules

Subir las reglas de seguridad a Firebase:

```bash
firebase deploy --only firestore:rules
```

O copiar manualmente el contenido de `firestore.rules` en Firebase Console.

### 6. Poblar Base de Datos

Opción A - Usar el script de seed:
1. Descomentar la importación en un componente temporal
2. Llamar a `seedDatabase()` una vez
3. Verificar en Firestore Console que se crearon los datos

Opción B - Crear datos manualmente en Firestore Console

### 7. Crear Usuario Administrador

1. Ir a Firebase Console → Authentication
2. Crear usuario con email y contraseña
3. Copiar el UID del usuario
4. En Firestore, crear colección `admins`
5. Crear documento con ID = UID del admin
6. Agregar campo: `{ role: "admin" }`

### 8. Crear Usuarios de Familia

Para cada familia (FAM001 - FAM027):
1. Crear usuario en Firebase Authentication
2. Email: `fam001@example.com` (o el email real de la familia)
3. Password: Asignar contraseña segura
4. **IMPORTANTE**: El UID del usuario debe coincidir con el ID del documento en Firestore
   - Opción 1: Crear usuario primero, copiar UID, crear documento con ese ID
   - Opción 2: Usar Cloud Functions para sincronizar automáticamente

## 🚀 Ejecutar Aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 👥 Usuarios de Prueba

### Administrador
- Email: (el que creaste en Firebase)
- Password: (la que asignaste)

### Familia
- Email: `fam001@example.com` (o cualquier FAM001-FAM027)
- Password: (la que asignaste)

## 📱 Flujo de Usuario

### Familia
1. Login con email/password
2. Ver información de cabina, barco, fecha de salida
3. Ver desglose de costos en CAD con conversión a MXN
4. Ver itinerario del crucero
5. Ver historial de pagos
6. Realizar solicitud de adelanto:
   - Ingresar monto en CAD
   - Ver conversión automática a MXN
   - Ingresar datos de tarjeta
   - Aceptar autorización
   - Enviar solicitud
7. Recibir confirmación (se contactará para completar el pago)

### Administrador
1. Login con email/password
2. Ver lista de 27 familias
3. Buscar por nombre, código o cabina
4. Ver detalle de familia
5. Editar montos (subtotal, propinas, pagado)
6. Ver solicitudes de pago pendientes
7. Aprobar o rechazar solicitudes
8. Al aprobar: se crea registro de pago y se actualiza saldo
9. Configurar tipo de cambio CAD/MXN

## 🔒 Seguridad

- ✅ Firestore Security Rules estrictas
- ✅ Familias solo pueden leer su propia información
- ✅ Familias solo pueden crear payment requests, no modificarlos
- ✅ Solo admin puede modificar datos financieros
- ✅ Datos de tarjeta NO se guardan completos
- ✅ Solo se almacenan últimos 4 dígitos
- ✅ CVV NUNCA se guarda
- ✅ Email solo contiene últimos 4 dígitos
- ✅ Rutas protegidas con autenticación

## 📧 Notificaciones

Cuando una familia envía una solicitud de adelanto:
1. Se crea documento en Firestore
2. Se envía email a `dplotnik@trevelo.com` con:
   - Información de la familia
   - Monto en CAD y MXN
   - Últimos 4 dígitos de tarjeta
   - Nombre del titular
   - Link al panel de admin

## 🎨 Personalización

### Cambiar Colores
Editar variables CSS en `src/styles/index.css`:
```css
:root {
  --color-primary: #1e40af;
  --color-secondary: #0891b2;
  /* ... más colores */
}
```

### Cambiar Tipo de Cambio por Defecto
Editar `src/hooks/useExchangeRate.js`:
```javascript
const [rate, setRate] = useState(14.5); // Cambiar valor aquí
```

## 📝 Notas Importantes

1. **No se procesan pagos reales**: La app solo captura la intención de pago
2. **Contacto manual**: El admin debe contactar a la familia para procesar el cargo
3. **Datos de tarjeta**: Solo para referencia, no se almacenan de forma segura para procesamiento
4. **Tipo de cambio**: Es aproximado, el banco determina la tasa final

## 🐛 Troubleshooting

### Error: "Firebase not configured"
- Verificar que `.env` existe y tiene todas las variables
- Reiniciar el servidor de desarrollo

### Error: "Permission denied"
- Verificar que las Security Rules están desplegadas
- Verificar que el usuario está autenticado
- Para admin: verificar que existe documento en colección `admins`

### Emails no se envían
- Verificar credenciales de EmailJS en `.env`
- Verificar que el template existe en EmailJS
- Revisar consola del navegador para errores

## 📄 Licencia

Proyecto privado para Trevelo.

## 👨‍💻 Soporte

Para soporte, contactar a: dplotnik@trevelo.com
