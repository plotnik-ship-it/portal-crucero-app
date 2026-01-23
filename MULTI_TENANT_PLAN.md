# 🏢 Plan: Sistema Multi-Tenant (Multi-Agencia)

## 🎯 Objetivo

Permitir que **múltiples agencias** usen la misma aplicación, cada una con sus propios grupos de cruceros, sin que se mezclen los datos entre ellas.

---

## 📊 Arquitectura Actual vs Propuesta

### ❌ Arquitectura Actual (Single-Tenant)

```
Application
└── Group (Schmal Group)
    ├── Families
    ├── Payments
    └── Settings
```

**Limitaciones:**
- Solo un grupo por aplicación
- No se puede escalar a múltiples agencias
- Datos mezclados si agregas más grupos

---

### ✅ Arquitectura Propuesta (Multi-Tenant)

```
Application
├── Agency 1 (TravelPoint)
│   ├── Group A (Schmal Cruise - Jan 2026)
│   │   ├── Families
│   │   ├── Payments
│   │   └── Settings
│   └── Group B (Smith Cruise - Mar 2026)
│       ├── Families
│       ├── Payments
│       └── Settings
│
└── Agency 2 (Otra Agencia)
    └── Group C (Johnson Cruise - Feb 2026)
        ├── Families
        ├── Payments
        └── Settings
```

**Ventajas:**
- ✅ Múltiples agencias en la misma app
- ✅ Cada agencia gestiona sus propios grupos
- ✅ Datos completamente aislados
- ✅ Escalable a cientos de agencias

---

## 🗂️ Cambios en la Estructura de Datos

### 1. Nueva Colección: `agencies`

```javascript
// Firestore: agencies/{agencyId}
{
  id: "agency_travelpoint",
  name: "TravelPoint",
  email: "admin@travelpoint.mx",
  logo: "https://...",
  branding: {
    primaryColor: "#1e40af",
    secondaryColor: "#0891b2",
    logoUrl: "https://..."
  },
  subscription: {
    plan: "premium", // free, basic, premium
    maxGroups: 10,
    maxFamiliesPerGroup: 100,
    expiresAt: timestamp
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. Actualizar Colección: `groups`

**Antes:**
```javascript
// groups/{groupId}
{
  id: "group001",
  name: "Schmal Group Cruise",
  // ... otros campos
}
```

**Después:**
```javascript
// groups/{groupId}
{
  id: "group001",
  agencyId: "agency_travelpoint", // 🆕 NUEVO CAMPO
  name: "Schmal Group Cruise - Jan 2026",
  // ... otros campos
}
```

### 3. Actualizar Colección: `users`

**Antes:**
```javascript
// users/{uid}
{
  email: "admin@travelpoint.mx",
  role: "admin",
  familyId: null
}
```

**Después:**
```javascript
// users/{uid}
{
  email: "admin@travelpoint.mx",
  role: "admin", // admin, family
  agencyId: "agency_travelpoint", // 🆕 Para admins
  familyId: null,
  
  // Para super-admins (opcional)
  isSuperAdmin: false, // Puede ver todas las agencias
  
  // Para admins de agencia
  permissions: {
    canCreateGroups: true,
    canDeleteGroups: true,
    canManageUsers: true
  }
}
```

### 4. Colección `families` - Sin Cambios

Las familias ya están vinculadas a grupos, y los grupos ahora están vinculados a agencias.

```javascript
// families/{familyId}
{
  id: "fam001",
  groupId: "group001", // Ya existe
  // ... otros campos
}
```

**Jerarquía:** Agency → Group → Family

---

## 🎨 Cambios en la Interfaz de Usuario

### 1. **Nuevo: Selector de Grupo en Admin Dashboard**

```
┌─────────────────────────────────────────────┐
│  TravelPoint Admin                    [👤]  │
├─────────────────────────────────────────────┤
│                                             │
│  📋 Selecciona un Grupo:                    │
│  ┌─────────────────────────────────────┐   │
│  │ 🚢 Schmal Group - Jan 2026      [→] │   │
│  │ 🚢 Smith Cruise - Mar 2026      [→] │   │
│  │ 🚢 Johnson Cruise - Feb 2026    [→] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ Crear Nuevo Grupo]                      │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. **Actualizar: Admin Dashboard**

Una vez seleccionado un grupo, mostrar el dashboard actual pero con:
- Breadcrumb: `TravelPoint > Schmal Group > Dashboard`
- Botón para cambiar de grupo
- Indicador visual del grupo activo

```
┌─────────────────────────────────────────────┐
│  TravelPoint > Schmal Group - Jan 2026      │
│  [← Cambiar Grupo]                    [👤]  │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Dashboard del Grupo                     │
│  ... (dashboard actual) ...                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 3. **Nuevo: Gestión de Agencia (Super Admin)**

Solo para super-admins que gestionan múltiples agencias:

```
┌─────────────────────────────────────────────┐
│  Super Admin Panel                    [👤]  │
├─────────────────────────────────────────────┤
│                                             │
│  🏢 Agencias:                               │
│  ┌─────────────────────────────────────┐   │
│  │ TravelPoint         [Gestionar]     │   │
│  │ Otra Agencia        [Gestionar]     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ Crear Nueva Agencia]                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔐 Seguridad: Firestore Rules

### Reglas Actualizadas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && getUserData().isSuperAdmin == true;
    }
    
    function isAgencyAdmin(agencyId) {
      return isAuthenticated() && 
             getUserData().role == 'admin' && 
             getUserData().agencyId == agencyId;
    }
    
    function isAdminOfGroup(groupId) {
      let groupData = get(/databases/$(database)/documents/groups/$(groupId)).data;
      return isAgencyAdmin(groupData.agencyId);
    }
    
    // Agencies collection
    match /agencies/{agencyId} {
      allow read: if isSuperAdmin() || isAgencyAdmin(agencyId);
      allow write: if isSuperAdmin();
    }
    
    // Groups collection
    match /groups/{groupId} {
      allow read: if isSuperAdmin() || 
                     isAdminOfGroup(groupId) ||
                     // Families can read their own group
                     (isAuthenticated() && 
                      getUserData().role == 'family' &&
                      exists(/databases/$(database)/documents/families/$(getUserData().familyId)) &&
                      get(/databases/$(database)/documents/families/$(getUserData().familyId)).data.groupId == groupId);
      
      allow create: if isSuperAdmin() || 
                       (isAuthenticated() && 
                        getUserData().role == 'admin' && 
                        request.resource.data.agencyId == getUserData().agencyId);
      
      allow update, delete: if isSuperAdmin() || isAdminOfGroup(groupId);
    }
    
    // Families collection
    match /families/{familyId} {
      allow read: if isSuperAdmin() || 
                     isAdminOfGroup(resource.data.groupId) ||
                     (isAuthenticated() && getUserData().familyId == familyId);
      
      allow write: if isSuperAdmin() || isAdminOfGroup(resource.data.groupId);
    }
    
    // Similar rules for payments, paymentRequests, etc.
  }
}
```

---

## 🛠️ Implementación por Fases

### **Fase 1: Preparación (Sin Romper Nada)** ⏱️ 1-2 días

1. ✅ Crear colección `agencies`
2. ✅ Crear agencia por defecto "TravelPoint"
3. ✅ Agregar campo `agencyId` a grupos existentes
4. ✅ Agregar campo `agencyId` a usuarios admin
5. ✅ Script de migración para datos existentes

**Resultado:** Datos migrados, app sigue funcionando igual

---

### **Fase 2: UI de Selección de Grupo** ⏱️ 2-3 días

1. ✅ Crear componente `GroupSelector`
2. ✅ Actualizar `AdminDashboard` para mostrar selector
3. ✅ Agregar estado global para grupo activo
4. ✅ Filtrar datos por grupo seleccionado

**Resultado:** Admin puede ver/gestionar múltiples grupos

---

### **Fase 3: Gestión de Grupos** ⏱️ 2-3 días

1. ✅ Formulario para crear nuevo grupo
2. ✅ Asignar grupo a agencia actual
3. ✅ Editar/eliminar grupos
4. ✅ Duplicar configuración entre grupos

**Resultado:** Admin puede crear y gestionar grupos

---

### **Fase 4: Multi-Agencia (Opcional)** ⏱️ 3-4 días

1. ✅ Panel de super-admin
2. ✅ Crear/gestionar agencias
3. ✅ Asignar admins a agencias
4. ✅ Branding por agencia

**Resultado:** Sistema completamente multi-tenant

---

### **Fase 5: Seguridad y Testing** ⏱️ 2-3 días

1. ✅ Actualizar Firestore Rules
2. ✅ Testing de aislamiento de datos
3. ✅ Testing de permisos
4. ✅ Documentación

**Resultado:** Sistema seguro y probado

---

## 📝 Ejemplo de Uso

### Escenario 1: TravelPoint con 3 Cruceros

**Admin:** `admin@travelpoint.mx`

**Dashboard:**
```
Grupos de TravelPoint:
1. Schmal Group - Enero 2026 (40 familias)
2. Smith Cruise - Marzo 2026 (35 familias)
3. Johnson Cruise - Abril 2026 (50 familias)
```

**Flujo:**
1. Admin entra al sistema
2. Ve lista de sus 3 grupos
3. Selecciona "Schmal Group"
4. Gestiona familias, pagos, etc. de ese grupo
5. Cambia a "Smith Cruise" cuando necesite

---

### Escenario 2: Ofrecer a Otra Agencia

**Nueva Agencia:** "Viajes Globales"
**Admin:** `admin@viajesglobales.com`

**Setup:**
1. Super-admin crea agencia "Viajes Globales"
2. Crea usuario admin para la agencia
3. Admin de Viajes Globales entra
4. Solo ve sus propios grupos (ninguno aún)
5. Crea su primer grupo "Crucero Caribe 2026"
6. Importa sus familias

**Aislamiento:**
- ❌ Viajes Globales NO puede ver datos de TravelPoint
- ❌ TravelPoint NO puede ver datos de Viajes Globales
- ✅ Cada agencia es completamente independiente

---

## 💰 Modelo de Negocio (Opcional)

### Planes de Suscripción

| Plan | Precio/Mes | Grupos | Familias/Grupo | Soporte |
|------|-----------|--------|----------------|---------|
| **Free** | $0 | 1 | 20 | Email |
| **Basic** | $49 | 3 | 50 | Email + Chat |
| **Premium** | $149 | 10 | 200 | Prioritario |
| **Enterprise** | Custom | Ilimitado | Ilimitado | Dedicado |

### Implementación

```javascript
// agencies/{agencyId}
{
  subscription: {
    plan: "premium",
    maxGroups: 10,
    maxFamiliesPerGroup: 200,
    billingEmail: "billing@travelpoint.mx",
    stripeCustomerId: "cus_...",
    currentPeriodEnd: timestamp,
    status: "active" // active, past_due, canceled
  }
}
```

---

## 🚀 Migración de Datos Existentes

### Script de Migración

```javascript
// scripts/migrateToMultiTenant.cjs
const admin = require('firebase-admin');

async function migrate() {
  const db = admin.firestore();
  
  // 1. Crear agencia por defecto
  const defaultAgency = {
    id: 'agency_travelpoint',
    name: 'TravelPoint',
    email: 'admin@travelpoint.mx',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await db.collection('agencies').doc(defaultAgency.id).set(defaultAgency);
  console.log('✅ Agencia creada');
  
  // 2. Actualizar grupos existentes
  const groupsSnapshot = await db.collection('groups').get();
  for (const doc of groupsSnapshot.docs) {
    await doc.ref.update({
      agencyId: defaultAgency.id
    });
  }
  console.log(`✅ ${groupsSnapshot.size} grupos actualizados`);
  
  // 3. Actualizar usuarios admin
  const usersSnapshot = await db.collection('users')
    .where('role', '==', 'admin').get();
  
  for (const doc of usersSnapshot.docs) {
    await doc.ref.update({
      agencyId: defaultAgency.id
    });
  }
  console.log(`✅ ${usersSnapshot.size} admins actualizados`);
  
  console.log('🎉 Migración completada');
}

migrate();
```

---

## 📊 Comparación: Antes vs Después

### Antes (Actual)

```
✅ Funciona para un solo grupo
❌ No escala a múltiples agencias
❌ Datos mezclados si agregas más grupos
❌ No puedes ofrecer como servicio
```

### Después (Multi-Tenant)

```
✅ Múltiples agencias
✅ Múltiples grupos por agencia
✅ Datos completamente aislados
✅ Escalable a cientos de agencias
✅ Puedes ofrecer como SaaS
✅ Modelo de suscripción opcional
```

---

## 🎯 Recomendación

### Opción 1: Solo Multi-Grupo (Más Simple)

**Si solo quieres gestionar múltiples grupos de TravelPoint:**
- Implementar Fases 1-3
- Tiempo: ~1 semana
- Complejidad: Media

### Opción 2: Multi-Agencia Completo (Escalable)

**Si quieres ofrecer a otras agencias:**
- Implementar Fases 1-5
- Tiempo: ~2-3 semanas
- Complejidad: Alta
- Beneficio: Sistema SaaS completo

---

## 📞 Próximos Pasos

1. **Decidir alcance:**
   - ¿Solo multi-grupo para TravelPoint?
   - ¿O multi-agencia completo?

2. **Priorizar fases:**
   - ¿Empezar con Fase 1 (migración)?
   - ¿O diseñar todo primero?

3. **Timeline:**
   - ¿Cuándo necesitas esto listo?
   - ¿Hay algún crucero próximo?

---

**¿Quieres que empiece con la Fase 1 (migración) o prefieres que diseñemos más detalles primero?** 🚀
