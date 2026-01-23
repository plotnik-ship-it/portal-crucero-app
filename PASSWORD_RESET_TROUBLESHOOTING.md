# Solución: Correos de Restablecimiento de Contraseña No Llegan

## 🔍 Problema
Los usuarios no reciben el correo electrónico para restablecer su contraseña cuando usan la función "¿Olvidaste tu contraseña?".

## ✅ Cambios Realizados en el Código

### 1. Mejorado `auth.js`
- Agregado `actionCodeSettings` para configurar la URL de redirección
- Agregado logging detallado para debugging
- Mejor manejo de errores

### 2. Mejorado `ForgotPassword.jsx`
- Mensaje de éxito más detallado con instrucciones
- Muestra el email al que se envió
- Incluye tips de troubleshooting (revisar spam, etc.)

## 🔧 Pasos para Verificar la Configuración de Firebase

### Paso 1: Verificar que Firebase Authentication está habilitado

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **cruise-portal-trevello**
3. En el menú lateral, ve a **Authentication**
4. Asegúrate de que el proveedor **Email/Password** esté habilitado

### Paso 2: Configurar las Plantillas de Email

1. En Firebase Console → **Authentication**
2. Ve a la pestaña **Templates** (Plantillas)
3. Selecciona **Password reset** (Restablecer contraseña)
4. Verifica/configura lo siguiente:

   **Remitente:**
   - Nombre: `TravelPoint Cruise Portal` (o el nombre que prefieras)
   - Email: `noreply@cruise-portal-trevello.firebaseapp.com`

   **Asunto:**
   ```
   Restablece tu contraseña - Portal de Crucero
   ```

   **Cuerpo del mensaje (ejemplo en español):**
   ```
   Hola,

   Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Portal de Crucero.

   Para restablecer tu contraseña, haz clic en el siguiente enlace:
   %LINK%

   Si no solicitaste este cambio, puedes ignorar este correo de forma segura.

   Este enlace expirará en 1 hora.

   Saludos,
   Equipo de TravelPoint
   ```

### Paso 3: Verificar el Dominio Autorizado

1. En Firebase Console → **Authentication**
2. Ve a la pestaña **Settings** (Configuración)
3. En **Authorized domains** (Dominios autorizados), asegúrate de tener:
   - `localhost` (para desarrollo)
   - Tu dominio de producción (ej: `portal-crucero.vercel.app`)

### Paso 4: Verificar que el Usuario Existe

**IMPORTANTE:** Firebase solo envía correos de restablecimiento a usuarios que **existen** en Authentication.

Para verificar:
1. Ve a Firebase Console → **Authentication** → **Users**
2. Busca el email del pasajero
3. Si NO aparece en la lista, necesitas crear el usuario primero

#### Crear Usuario Manualmente (si no existe):

**Opción A: Desde Firebase Console**
1. En Authentication → Users
2. Click en **Add user**
3. Ingresa el email y una contraseña temporal
4. El usuario podrá usar "Olvidé mi contraseña" para establecer su propia contraseña

**Opción B: Usando el script de creación**
```bash
node scripts/createAuthUsers.cjs
```

### Paso 5: Probar el Flujo Completo

1. Abre la aplicación en modo incógnito/privado
2. Ve a `/forgot-password`
3. Ingresa el email del usuario
4. Abre la consola del navegador (F12)
5. Busca los logs:
   ```
   🔐 Sending password reset email to: usuario@example.com
   🔐 Auth domain: cruise-portal-trevello.firebaseapp.com
   ✅ Password reset email sent successfully
   ```

6. Si ves un error, anota el código de error (ej: `auth/user-not-found`)

## 🐛 Problemas Comunes y Soluciones

### Error: `auth/user-not-found`
**Causa:** El usuario no existe en Firebase Authentication
**Solución:** Crear el usuario en Firebase Console o usando el script

### Error: `auth/invalid-email`
**Causa:** El formato del email no es válido
**Solución:** Verificar que el email esté escrito correctamente

### El correo no llega (sin errores)
**Causas posibles:**
1. **Filtro de spam:** El correo está en la carpeta de spam
2. **Demora del servidor:** Puede tardar 5-10 minutos
3. **Dominio no verificado:** Firebase puede requerir verificación adicional
4. **Límites de Firebase:** Plan gratuito tiene límites de emails/día

**Soluciones:**
1. Revisar carpeta de spam/correo no deseado
2. Esperar 10-15 minutos
3. Buscar emails de `noreply@cruise-portal-trevello.firebaseapp.com`
4. Verificar en Firebase Console → Authentication → Users si hay actividad reciente

### Verificar Cuota de Emails

Firebase Spark (plan gratuito) tiene límites:
- Emails de autenticación: Generalmente ilimitados, pero pueden tener rate limiting

Para verificar:
1. Firebase Console → **Usage** (Uso)
2. Revisa si hay alertas o límites alcanzados

## 📧 Configuración Avanzada (Opcional)

### Usar un Dominio de Email Personalizado

Si quieres usar tu propio dominio (ej: `noreply@travelpoint.mx`):

1. Firebase Console → **Authentication** → **Templates**
2. Click en **Customize action URL**
3. Configura tu dominio personalizado
4. Sigue las instrucciones de verificación DNS

**Nota:** Esto requiere el plan Blaze (pago por uso) de Firebase.

## 🧪 Comando de Prueba Rápida

Para probar si el sistema funciona, puedes usar la consola del navegador:

```javascript
// Abre la consola en /forgot-password
// Pega este código:
import { resetPassword } from './services/auth';
await resetPassword('tu-email@example.com');
// Revisa los logs en la consola
```

## 📞 Siguiente Paso

1. **Verifica que el usuario existe** en Firebase Authentication
2. **Revisa la carpeta de spam** del correo del pasajero
3. **Configura las plantillas de email** en Firebase Console
4. **Prueba con otro email** (tuyo) para confirmar que funciona

## 🔗 Enlaces Útiles

- [Firebase Console - Tu Proyecto](https://console.firebase.google.com/project/cruise-portal-trevello)
- [Documentación de Firebase Auth](https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email)
- [Troubleshooting Email Delivery](https://firebase.google.com/docs/auth/troubleshooting)
