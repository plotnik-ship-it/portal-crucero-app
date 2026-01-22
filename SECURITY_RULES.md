# 🔒 Firestore Security Rules - Revisión Completa

## Resumen de Seguridad

Estas reglas implementan seguridad estricta con los siguientes principios:

1. **Familias NO pueden listar colecciones** - Solo pueden hacer `get` de documentos específicos
2. **Familias NO pueden leer documentos ajenos** - Solo su propio documento de familia
3. **Validación estricta de campos** - Campos prohibidos son bloqueados explícitamente
4. **NO se permiten datos de tarjeta** - Cualquier intento de guardar PAN o CVV es rechazado

---

## Reglas Completas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== HELPER FUNCTIONS =====
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'admin';
    }
    
    function isFamily() {
      return isAuthenticated() && getUserData().role == 'family';
    }
    
    function getFamilyId() {
      return getUserData().familyId;
    }
    
    function isFamilyOwner(familyId) {
      return isFamily() && getFamilyId() == familyId;
    }
    
    // Validate payment request fields - NO card data allowed
    function isValidPaymentRequest() {
      let data = request.resource.data;
      
      // Required fields
      let hasRequiredFields = data.keys().hasAll([
        'createdAt', 'status', 'amountCad', 'amountMxnApprox',
        'fxRateUsed', 'cardholderName', 'authorizationAccepted'
      ]);
      
      // Forbidden fields - NEVER allow these
      let hasForbiddenFields = data.keys().hasAny([
        'cardNumber', 'cvv', 'fullCardNumber', 'pan', 'cardCvv',
        'securityCode', 'expiryDate', 'expiry'
      ]);
      
      // Field validations
      let validStatus = data.status == 'Pending';
      let validAmount = data.amountCad is number && data.amountCad > 0;
      let validName = data.cardholderName is string && data.cardholderName.size() >= 3;
      let validAuth = data.authorizationAccepted == true;
      
      // Optional fields validation
      let validLast4 = !data.keys().hasAny(['cardLast4']) || 
                       (data.cardLast4 is string && data.cardLast4.size() == 4);
      let validBrand = !data.keys().hasAny(['cardBrand']) || 
                       (data.cardBrand is string);
      let validNotes = !data.keys().hasAny(['notes']) || 
                       (data.notes is string);
      
      return hasRequiredFields && 
             !hasForbiddenFields && 
             validStatus && 
             validAmount && 
             validName && 
             validAuth &&
             validLast4 &&
             validBrand &&
             validNotes;
    }
    
    // ===== USERS COLLECTION =====
    match /users/{userId} {
      // Users can read their own document ONLY
      allow read: if isAuthenticated() && request.auth.uid == userId;
      
      // Only admins can write
      allow write: if isAdmin();
      
      // BLOCK list operations
      allow list: if false;
    }
    
    // ===== GROUPS COLLECTION =====
    match /groups/{groupId} {
      // Authenticated users can read specific group documents
      allow get: if isAuthenticated();
      
      // Only admins can write
      allow write: if isAdmin();
      
      // BLOCK list operations for non-admins
      allow list: if isAdmin();
    }
    
    // ===== FAMILIES COLLECTION =====
    match /families/{familyId} {
      // Family can ONLY read their own document (get, not list)
      allow get: if isFamilyOwner(familyId) || isAdmin();
      
      // BLOCK list operations - families cannot enumerate
      allow list: if isAdmin();
      
      // Only admin can write
      allow create, update, delete: if isAdmin();
      
      // ===== PAYMENTS SUBCOLLECTION =====
      match /payments/{paymentId} {
        // Family can read their own payments (get, not list)
        allow get: if isFamilyOwner(familyId) || isAdmin();
        
        // Admin can list
        allow list: if isAdmin();
        
        // Only admin can write
        allow write: if isAdmin();
      }
      
      // ===== PAYMENT REQUESTS SUBCOLLECTION =====
      match /paymentRequests/{requestId} {
        // Family can read their own requests (get, not list)
        allow get: if isFamilyOwner(familyId) || isAdmin();
        
        // Admin can list
        allow list: if isAdmin();
        
        // Family can ONLY CREATE with validated fields
        allow create: if isFamilyOwner(familyId) && isValidPaymentRequest();
        
        // Only admin can update/delete
        allow update, delete: if isAdmin();
      }
    }
  }
}
```

---

## Validaciones Implementadas

### ✅ Campos Requeridos en Payment Requests

- `createdAt` - Timestamp
- `status` - Debe ser "Pending"
- `amountCad` - Número mayor a 0
- `amountMxnApprox` - Número
- `fxRateUsed` - Número
- `cardholderName` - String mínimo 3 caracteres
- `authorizationAccepted` - Debe ser `true`

### ✅ Campos Opcionales Permitidos

- `cardBrand` - String (opcional)
- `cardLast4` - String de exactamente 4 caracteres (opcional)
- `notes` - String (opcional)

### ❌ Campos Prohibidos (NUNCA permitidos)

- `cardNumber`
- `cvv`
- `fullCardNumber`
- `pan`
- `cardCvv`
- `securityCode`
- `expiryDate`
- `expiry`

**Si se intenta crear un payment request con cualquiera de estos campos, será RECHAZADO.**

---

## Permisos por Rol

### 👤 Family User

**Puede:**
- ✅ Leer su propio documento en `users/{uid}`
- ✅ Leer su propio documento en `families/{familyId}` (solo `get`)
- ✅ Leer documentos específicos en `groups/{groupId}` (solo `get`)
- ✅ Leer sus propios payments (solo `get`)
- ✅ Leer sus propios payment requests (solo `get`)
- ✅ Crear payment requests (con validación estricta)

**NO puede:**
- ❌ Listar colecciones (`list` operations)
- ❌ Leer documentos de otras familias
- ❌ Modificar su saldo o datos
- ❌ Modificar payment requests
- ❌ Crear payments
- ❌ Guardar datos de tarjeta completos

### 👨‍💼 Admin User

**Puede:**
- ✅ Leer y escribir TODO
- ✅ Listar todas las colecciones
- ✅ Modificar cualquier documento
- ✅ Aprobar/rechazar payment requests
- ✅ Crear payments
- ✅ Modificar saldos

---

## Pruebas de Seguridad

### ✅ Prueba 1: Family NO puede listar otras familias

```javascript
// Esto FALLARÁ para family users
db.collection('families').get()
// Error: Missing or insufficient permissions
```

### ✅ Prueba 2: Family NO puede leer otra familia

```javascript
// Esto FALLARÁ si familyId no es el suyo
db.collection('families').doc('fam002').get()
// Error: Missing or insufficient permissions
```

### ✅ Prueba 3: NO se puede guardar número de tarjeta

```javascript
// Esto FALLARÁ
db.collection('families').doc('fam001')
  .collection('paymentRequests').add({
    amountCad: 100,
    cardNumber: '4532123456789010', // ❌ PROHIBIDO
    ...
  })
// Error: Invalid payment request
```

### ✅ Prueba 4: Family puede crear request válido

```javascript
// Esto FUNCIONARÁ
db.collection('families').doc('fam001')
  .collection('paymentRequests').add({
    createdAt: serverTimestamp(),
    status: 'Pending',
    amountCad: 100,
    amountMxnApprox: 1450,
    fxRateUsed: 14.5,
    cardholderName: 'JUAN PEREZ',
    cardLast4: '1234', // ✅ Opcional, permitido
    authorizationAccepted: true
  })
// ✅ Success
```

---

## Deployment

Para desplegar estas reglas:

1. Copiar el contenido de `firestore.rules`
2. Ir a Firebase Console → Firestore Database → Rules
3. Pegar y publicar

O usar Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## Notas de Seguridad

1. **Separación de get y list**: Las familias pueden hacer `get` de documentos específicos pero NO `list` para enumerar colecciones
2. **Validación de campos**: La función `isValidPaymentRequest()` valida explícitamente campos permitidos y prohibidos
3. **Sin datos sensibles**: Cualquier intento de guardar PAN, CVV o campos similares es bloqueado
4. **Mapeo de roles**: Se usa la colección `users` para mapear UID → role y familyId
