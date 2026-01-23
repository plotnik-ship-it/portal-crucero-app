const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function checkAndCreateUser() {
    console.log('🔍 Verificador de Usuario para Restablecimiento de Contraseña\n');

    try {
        const email = await question('Ingresa el email del pasajero: ');

        if (!email || !email.includes('@')) {
            console.log('❌ Email inválido');
            rl.close();
            process.exit(1);
        }

        console.log(`\n🔍 Buscando usuario: ${email}...\n`);

        // 1. Check if user exists in Firebase Auth
        let authUser;
        try {
            authUser = await auth.getUserByEmail(email);
            console.log('✅ Usuario encontrado en Firebase Authentication:');
            console.log(`   - UID: ${authUser.uid}`);
            console.log(`   - Email: ${authUser.email}`);
            console.log(`   - Email verificado: ${authUser.emailVerified ? 'Sí' : 'No'}`);
            console.log(`   - Deshabilitado: ${authUser.disabled ? 'Sí' : 'No'}`);
            console.log(`   - Última vez activo: ${authUser.metadata.lastSignInTime || 'Nunca'}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('❌ Usuario NO encontrado en Firebase Authentication\n');

                // Check if there's a family with this email
                const familiesRef = db.collection('families');
                const snapshot = await familiesRef.where('email', '==', email).get();

                if (snapshot.empty) {
                    console.log('❌ Tampoco existe una familia con este email en Firestore');
                    console.log('\n💡 Opciones:');
                    console.log('   1. Verifica que el email esté escrito correctamente');
                    console.log('   2. Crea la familia primero en el Admin Dashboard');
                    console.log('   3. Ejecuta el script de importación CSV si tienes los datos\n');
                    rl.close();
                    process.exit(1);
                }

                const familyDoc = snapshot.docs[0];
                const familyData = familyDoc.data();

                console.log('✅ Familia encontrada en Firestore:');
                console.log(`   - ID: ${familyDoc.id}`);
                console.log(`   - Nombre: ${familyData.displayName}`);
                console.log(`   - Email: ${familyData.email}`);

                const createUser = await question('\n¿Crear usuario en Authentication? (s/n): ');

                if (createUser.toLowerCase() === 's' || createUser.toLowerCase() === 'si') {
                    const password = await question('Ingresa contraseña temporal (o presiona Enter para "password123"): ');
                    const finalPassword = password.trim() || 'password123';

                    console.log('\n🔨 Creando usuario...');

                    const userRecord = await auth.createUser({
                        email: familyData.email,
                        emailVerified: false,
                        password: finalPassword,
                        displayName: familyData.displayName,
                        disabled: false
                    });

                    // Create User Role Link
                    await db.collection('users').doc(userRecord.uid).set({
                        email: familyData.email,
                        role: 'family',
                        familyId: familyDoc.id,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log('\n✅ Usuario creado exitosamente!');
                    console.log(`   - UID: ${userRecord.uid}`);
                    console.log(`   - Email: ${userRecord.email}`);
                    console.log(`   - Contraseña temporal: ${finalPassword}`);
                    console.log('\n📧 Ahora el usuario puede:');
                    console.log('   1. Usar "Olvidé mi contraseña" para establecer su propia contraseña');
                    console.log(`   2. O iniciar sesión con: ${familyData.email} / ${finalPassword}`);
                } else {
                    console.log('\n❌ Operación cancelada');
                }
            } else {
                throw error;
            }
        }

        // 2. Check if user document exists in Firestore
        if (authUser) {
            console.log('\n🔍 Verificando documento de usuario en Firestore...');
            const userDoc = await db.collection('users').doc(authUser.uid).get();

            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log('✅ Documento de usuario encontrado:');
                console.log(`   - Role: ${userData.role}`);
                console.log(`   - Family ID: ${userData.familyId || 'N/A'}`);

                if (userData.familyId) {
                    const familyDoc = await db.collection('families').doc(userData.familyId).get();
                    if (familyDoc.exists()) {
                        const familyData = familyDoc.data();
                        console.log(`   - Familia: ${familyData.displayName}`);
                    }
                }
            } else {
                console.log('⚠️  Documento de usuario NO encontrado en Firestore');
                console.log('   Esto puede causar problemas de autorización');

                const createDoc = await question('\n¿Crear documento de usuario? (s/n): ');

                if (createDoc.toLowerCase() === 's' || createDoc.toLowerCase() === 'si') {
                    // Search for family
                    const familiesRef = db.collection('families');
                    const snapshot = await familiesRef.where('email', '==', email).get();

                    if (!snapshot.empty) {
                        const familyDoc = snapshot.docs[0];
                        await db.collection('users').doc(authUser.uid).set({
                            email: email,
                            role: 'family',
                            familyId: familyDoc.id,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('✅ Documento de usuario creado y vinculado a la familia');
                    } else {
                        console.log('❌ No se encontró familia para vincular');
                    }
                }
            }

            console.log('\n✅ El usuario puede usar "Olvidé mi contraseña" sin problemas');
            console.log('\n📧 Instrucciones para el pasajero:');
            console.log('   1. Ir a la página de login');
            console.log('   2. Click en "¿Olvidaste tu contraseña?"');
            console.log(`   3. Ingresar: ${email}`);
            console.log('   4. Revisar email (incluyendo carpeta de spam)');
            console.log('   5. Buscar email de: noreply@cruise-portal-trevello.firebaseapp.com');
        }

        rl.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

checkAndCreateUser();
