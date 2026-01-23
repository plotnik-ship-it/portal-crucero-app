# 📧 Configurar Email Personalizado para Firebase Authentication

## Opciones Disponibles

### ✅ Opción 1: Cambiar Nombre del Remitente (GRATIS - Recomendado)

**Resultado:** `TravelPoint <noreply@cruise-portal-trevello.firebaseapp.com>`

**Pasos:**
1. Ve a [Firebase Console](https://console.firebase.google.com/project/cruise-portal-trevello)
2. **Authentication** → **Templates** (Plantillas)
3. Click en **Password reset** (Restablecer contraseña)
4. En **Sender name** (Nombre del remitente), cambia a:
   ```
   TravelPoint
   ```
   o
   ```
   The Travel Point
   ```
5. Click en **Save** (Guardar)

**Ventajas:**
- ✅ Gratis
- ✅ Sin configuración DNS
- ✅ Funciona inmediatamente
- ✅ Profesional (el nombre es lo que más se ve)

**Desventajas:**
- ❌ El dominio sigue siendo `@cruise-portal-trevello.firebaseapp.com`

---

### 💰 Opción 2: Dominio Personalizado Completo

**Resultado:** `TravelPoint <noreply@thetravelpoint.mytravelpoint.ca>`

#### Requisitos Previos

1. **Plan Blaze de Firebase** (pago por uso)
   - Costo base: $0/mes
   - Solo pagas por uso (emails de auth son generalmente gratis o muy baratos)
   - [Actualizar a Blaze](https://console.firebase.google.com/project/cruise-portal-trevello/usage/details)

2. **Acceso a DNS de mytravelpoint.ca**
   - Necesitas poder agregar registros SPF, DKIM, DMARC

3. **Servicio de Email SMTP** (una de estas opciones):
   - SendGrid (recomendado)
   - Mailgun
   - Amazon SES
   - SMTP de tu hosting

#### Opción 2A: Usar SendGrid (Recomendado)

SendGrid tiene un plan gratuito de 100 emails/día.

##### Paso 1: Crear Cuenta en SendGrid

1. Ve a [SendGrid](https://sendgrid.com/)
2. Crea una cuenta gratuita
3. Verifica tu email

##### Paso 2: Verificar Dominio en SendGrid

1. En SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Click en **Authenticate Your Domain**
3. Ingresa tu dominio: `mytravelpoint.ca`
4. SendGrid te dará registros DNS para agregar:

   ```
   Tipo: CNAME
   Host: em1234.mytravelpoint.ca
   Valor: u1234567.wl123.sendgrid.net

   Tipo: CNAME
   Host: s1._domainkey.mytravelpoint.ca
   Valor: s1.domainkey.u1234567.wl123.sendgrid.net

   Tipo: CNAME
   Host: s2._domainkey.mytravelpoint.ca
   Valor: s2.domainkey.u1234567.wl123.sendgrid.net
   ```

5. Agrega estos registros en tu proveedor de DNS (GoDaddy, Cloudflare, etc.)
6. Espera 24-48 horas para propagación
7. Verifica en SendGrid

##### Paso 3: Crear API Key en SendGrid

1. En SendGrid → **Settings** → **API Keys**
2. Click en **Create API Key**
3. Nombre: `Firebase Auth Emails`
4. Permisos: **Full Access** (o solo **Mail Send**)
5. Copia la API Key (solo se muestra una vez)

##### Paso 4: Configurar Firebase con SendGrid

**IMPORTANTE:** Firebase Authentication NO soporta SMTP personalizado directamente.

Tienes 2 opciones:

**Opción A: Usar Firebase Extensions (Más Fácil)**

1. Ve a Firebase Console → **Extensions**
2. Busca e instala: **Trigger Email from Firestore**
3. Configura con tus credenciales de SendGrid
4. Modifica tu código para usar esta extensión en lugar de `sendPasswordResetEmail`

**Opción B: Implementar Sistema Personalizado**

Necesitarás:
1. Crear tu propio endpoint para password reset
2. Generar tokens personalizados
3. Enviar emails via SendGrid API
4. Manejar la verificación de tokens

#### Opción 2B: Usar Custom Action URL (Más Simple)

Esta opción te permite usar tu dominio en la URL de reset, pero el email sigue viniendo de Firebase:

##### Paso 1: Configurar Dominio Personalizado en Firebase Hosting

1. Ve a Firebase Console → **Hosting**
2. Click en **Add custom domain**
3. Ingresa: `portal.mytravelpoint.ca` (o el subdominio que prefieras)
4. Sigue las instrucciones para verificar el dominio (agregar registros DNS)

##### Paso 2: Configurar Action URL

1. Firebase Console → **Authentication** → **Templates**
2. Click en **Customize action URL**
3. Ingresa: `https://portal.mytravelpoint.ca/__/auth/action`
4. Guarda

**Resultado:**
- Email viene de: `noreply@cruise-portal-trevello.firebaseapp.com`
- Pero el link de reset apunta a: `https://portal.mytravelpoint.ca/__/auth/action?mode=resetPassword&...`

---

## 🎯 Recomendación

### Para Uso Inmediato (HOY):
**Opción 1: Cambiar solo el nombre del remitente**

```
De: TravelPoint <noreply@cruise-portal-trevello.firebaseapp.com>
```

Esto es:
- ✅ Gratis
- ✅ Inmediato (5 minutos)
- ✅ Profesional
- ✅ Sin configuración técnica

### Para Futuro (Si es Crítico):
**Opción 2B: Custom Action URL + Nombre Personalizado**

```
De: TravelPoint <noreply@cruise-portal-trevello.firebaseapp.com>
Link: https://portal.mytravelpoint.ca/...
```

Esto requiere:
- Plan Blaze (~$0-5/mes para este uso)
- Configuración de dominio personalizado
- 1-2 días para propagación DNS

### Solo si es ABSOLUTAMENTE necesario:
**Opción 2A: Email completamente personalizado con SendGrid**

Esto requiere:
- Reescribir el sistema de autenticación
- Implementar manejo de tokens personalizado
- Configuración compleja
- Tiempo de desarrollo: 1-2 semanas

---

## 📋 Pasos Inmediatos Recomendados

### Ahora Mismo (5 minutos):

1. Ve a [Firebase Console - Templates](https://console.firebase.google.com/project/cruise-portal-trevello/authentication/emails)
2. Click en **Password reset**
3. Cambia **Sender name** a: `TravelPoint`
4. Personaliza el mensaje en español (ver ejemplo abajo)
5. Guarda

### Mensaje Personalizado en Español:

**Asunto:**
```
Restablece tu contraseña - Portal de Crucero TravelPoint
```

**Cuerpo:**
```
Hola,

Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Portal de Crucero de TravelPoint.

Para restablecer tu contraseña, haz clic en el siguiente enlace:

%LINK%

Si no solicitaste este cambio, puedes ignorar este correo de forma segura.

Este enlace expirará en 1 hora por seguridad.

¡Nos vemos en el crucero! 🚢

Equipo de TravelPoint
www.mytravelpoint.ca
```

---

## 💡 Nota Importante

La mayoría de los usuarios **no prestan atención al dominio del email**, sino al:
1. **Nombre del remitente** (TravelPoint)
2. **Asunto del mensaje**
3. **Contenido del email**

Cambiar solo el nombre del remitente a "TravelPoint" será suficiente para el 95% de los casos y es la solución más práctica.

---

## 🔗 Enlaces Útiles

- [Firebase Console - Authentication](https://console.firebase.google.com/project/cruise-portal-trevello/authentication)
- [Firebase Email Templates](https://console.firebase.google.com/project/cruise-portal-trevello/authentication/emails)
- [SendGrid](https://sendgrid.com/)
- [Firebase Pricing](https://firebase.google.com/pricing)
