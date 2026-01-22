const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateItinerary() {
    console.log('📅 Actualizando itinerario del crucero...');

    try {
        const groupRef = db.collection('groups').doc('default');

        const updatedGroupData = {
            name: 'Grupo Crucero MSC Seascape 2027',
            shipName: 'MSC SEASCAPE',
            sailDate: '2027-12-26',
            embarkationPort: 'GLS', // Galveston
            duration: 7,
            currency: 'CAD',
            fxRateCadToMxn: 14.5,
            fxUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            itinerary: [
                {
                    day: 1,
                    date: 'Sun, Dec 26, 2027',
                    port: 'Galveston, Texas',
                    arrive: '-',
                    depart: '4:00 PM'
                },
                {
                    day: 2,
                    date: 'Mon, Dec 27, 2027',
                    port: 'At Sea',
                    arrive: '-',
                    depart: '-'
                },
                {
                    day: 3,
                    date: 'Tue, Dec 28, 2027',
                    port: 'At Sea',
                    arrive: '-',
                    depart: '-'
                },
                {
                    day: 4,
                    date: 'Wed, Dec 29, 2027',
                    port: 'Costa Maya, Mexico',
                    arrive: '8:00 AM',
                    depart: '6:00 PM'
                },
                {
                    day: 5,
                    date: 'Thu, Dec 30, 2027',
                    port: 'Isla de Roatan, Honduras',
                    arrive: '8:00 AM',
                    depart: '4:00 PM'
                },
                {
                    day: 6,
                    date: 'Fri, Dec 31, 2027',
                    port: 'Cozumel, Mexico',
                    arrive: '8:00 AM',
                    depart: '4:00 PM'
                },
                {
                    day: 7,
                    date: 'Sat, Jan 01, 2028',
                    port: 'At Sea',
                    arrive: '-',
                    depart: '-'
                },
                {
                    day: 8,
                    date: 'Sun, Jan 02, 2028',
                    port: 'Galveston, Texas',
                    arrive: '6:30 AM',
                    depart: '-'
                }
            ],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await groupRef.set(updatedGroupData, { merge: true });

        console.log('✅ Itinerario actualizado exitosamente!');
        console.log('\nDetalles del crucero:');
        console.log(`  Barco: ${updatedGroupData.shipName}`);
        console.log(`  Fecha de salida: ${updatedGroupData.sailDate}`);
        console.log(`  Puerto de embarque: Galveston (${updatedGroupData.embarkationPort})`);
        console.log(`  Duración: ${updatedGroupData.duration} días`);
        console.log(`  Puertos: ${updatedGroupData.itinerary.length} paradas`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error actualizando itinerario:', error);
        process.exit(1);
    }
}

updateItinerary();
