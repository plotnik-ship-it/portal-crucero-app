# ⚡ Quick Start - 10 Minutos

## 1. Firebase (3 min)

```bash
# 1. Crear proyecto en https://console.firebase.google.com/
# 2. Habilitar Authentication (Email/Password)
# 3. Crear Firestore (modo producción)
# 4. Copiar credenciales a .env
# 5. Descargar Service Account Key → serviceAccountKey.json
```

## 2. Variables de Entorno (1 min)

Crear `.env`:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_ADMIN_EMAIL=dplotnik@trevello.com
```

## 3. Poblar Base de Datos (2 min)

```bash
npm run setup-db
```

Esto ejecuta:
- `seedFirestore.js` - Crea grupo y 27 familias
- `createUsers.js` - Crea usuarios en Auth + colección users

## 4. Security Rules (1 min)

Copiar contenido de `firestore.rules` a Firebase Console → Firestore → Reglas → Publicar

## 5. EmailJS (2 min)

1. Crear cuenta en https://www.emailjs.com/
2. Conectar Gmail
3. Crear template (ver SETUP.md para contenido exacto)
4. Copiar Service ID, Template ID y Public Key a `.env`

## 6. Probar (1 min)

```bash
npm run dev
```

Login:
- Admin: `dplotnik@trevello.com` / `AdminCrucero2026!`
- Familia: `fam001@example.com` / `Crucero2026!`

---

**Ver SETUP.md para instrucciones detalladas paso a paso.**
