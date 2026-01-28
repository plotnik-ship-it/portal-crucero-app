// Script to seed Firestore with sample data
// Run this once to populate the database with test data

import { db } from '../services/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

// Sample group data
const groupData = {
    name: 'Grupo Crucero Caribe 2026',
    shipName: 'Royal Caribbean - Harmony of the Seas',
    sailDate: '2026-06-15',
    currency: 'CAD',
    fxRateCadToMxn: 14.5,
    fxUpdatedAt: new Date(),
    itinerary: [
        { day: 1, port: 'Miami, Florida', arrive: '-', depart: '16:00' },
        { day: 2, port: 'En el mar', arrive: '-', depart: '-' },
        { day: 3, port: 'Cozumel, México', arrive: '08:00', depart: '18:00' },
        { day: 4, port: 'Roatán, Honduras', arrive: '08:00', depart: '17:00' },
        { day: 5, port: 'Costa Maya, México', arrive: '08:00', depart: '17:00' },
        { day: 6, port: 'En el mar', arrive: '-', depart: '-' },
        { day: 7, port: 'Miami, Florida', arrive: '06:00', depart: '-' }
    ]
};

// Generate 27 sample families
const generateFamilies = () => {
    const families = [];
    const firstNames = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Álvarez', 'Romero', 'Méndez', 'Castro', 'Vargas', 'Ortiz', 'Silva', 'Ramos'];

    for (let i = 1; i <= 27; i++) {
        const bookingCode = `FAM${String(i).padStart(3, '0')}`;
        const lastName = firstNames[i - 1];

        // Randomly assign 1 or 2 cabins
        const numCabins = Math.random() > 0.7 ? 2 : 1;
        const cabinNumbers = numCabins === 2
            ? [`A${100 + i}`, `A${100 + i + 100}`]
            : [`A${100 + i}`];

        // Random costs (realistic cruise prices in CAD)
        const subtotalCad = Math.round((3500 + Math.random() * 2000) * numCabins * 100) / 100;
        const gratuitiesCad = Math.round(subtotalCad * 0.15 * 100) / 100;
        const totalCad = subtotalCad + gratuitiesCad;

        // Random payment progress
        const paidPercentage = Math.random() * 0.8; // 0-80% paid
        const paidCad = Math.round(totalCad * paidPercentage * 100) / 100;
        const balanceCad = totalCad - paidCad;

        families.push({
            id: bookingCode.toLowerCase(),
            groupId: 'default',
            bookingCode,
            displayName: `Familia ${lastName}`,
            email: `${bookingCode.toLowerCase()}@example.com`,
            cabinNumbers,
            subtotalCad,
            gratuitiesCad,
            totalCad,
            paidCad,
            balanceCad,
            paymentDeadlines: [
                {
                    label: 'Depósito Inicial',
                    dueDate: '2026-01-15',
                    amountCad: Math.round(totalCad * 0.25 * 100) / 100,
                    status: paidCad >= totalCad * 0.25 ? 'Paid' : 'Overdue'
                },
                {
                    label: 'Segundo Pago',
                    dueDate: '2026-03-15',
                    amountCad: Math.round(totalCad * 0.25 * 100) / 100,
                    status: paidCad >= totalCad * 0.5 ? 'Paid' : paidCad >= totalCad * 0.25 ? 'Upcoming' : 'Overdue'
                },
                {
                    label: 'Pago Final',
                    dueDate: '2026-05-15',
                    amountCad: Math.round(totalCad * 0.5 * 100) / 100,
                    status: paidCad >= totalCad ? 'Paid' : 'Upcoming'
                }
            ]
        });
    }

    return families;
};

// Seed function
export const seedDatabase = async () => {
    try {
        console.log('Starting database seed...');

        // Create group
        await setDoc(doc(db, 'groups', 'default'), groupData);
        console.log('✓ Group created');

        // Create families
        const families = generateFamilies();
        for (const family of families) {
            await setDoc(doc(db, 'families', family.id), family);
            console.log(`✓ Created ${family.bookingCode}`);
        }

        console.log('✓ Database seeded successfully!');
        console.log(`Created 1 group and ${families.length} families`);

        return { success: true, message: 'Database seeded successfully' };
    } catch (error) {
        console.error('Error seeding database:', error);
        return { success: false, error: error.message };
    }
};

// Instructions for use:
// 1. Make sure Firebase is configured in .env
// 2. Import this file in a component or create a seed page
// 3. Call seedDatabase() once to populate the database
// 4. Create admin user manually in Firebase Authentication
// 5. Add admin UID to admins collection: { uid: 'admin-uid-here' }
