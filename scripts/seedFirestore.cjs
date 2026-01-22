#!/usr/bin/env node

/**
 * Seed Script for Portal de Crucero - Multi-Cabin Support
 * 
 * This script populates Firestore with:
 * - 1 group document
 * - 27 family documents with 'cabinAccounts' structure
 * 
 * Requirements:
 * - Firebase Admin SDK service account key (serviceAccountKey.json)
 * - Node.js 18+
 * 
 * Usage:
 *   node scripts/seedFirestore.cjs
 */

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

// Group data
const groupData = {
    name: 'Grupo Crucero Caribe 2026',
    shipName: 'Royal Caribbean - Harmony of the Seas',
    sailDate: '2026-06-15',
    currency: 'CAD',
    fxRateCadToMxn: 14.5,
    fxUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

// Generate cabin data with realistic costs
function generateCabinData(cabinNumber, baseCost) {
    const subtotalCad = Math.round(baseCost * 100) / 100;
    const gratuitiesCad = Math.round(subtotalCad * 0.15 * 100) / 100;
    const totalCad = Number((subtotalCad + gratuitiesCad).toFixed(2));

    // Random payment progress for this cabin
    const paidPercentage = Math.random() * 0.6; // 0-60% paid
    const paidCad = Math.round(totalCad * paidPercentage * 100) / 100;
    const balanceCad = Number((totalCad - paidCad).toFixed(2));

    const deadlines = [
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
    ];

    return {
        cabinNumber,
        subtotalCad,
        gratuitiesCad,
        totalCad,
        paidCad,
        balanceCad,
        paymentDeadlines: deadlines
    };
}

// Generate 27 families
function generateFamilies() {
    const families = [];
    const lastNames = [
        'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández',
        'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera',
        'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez',
        'Ruiz', 'Álvarez', 'Romero', 'Méndez', 'Castro', 'Vargas',
        'Ortiz', 'Silva', 'Ramos'
    ];

    for (let i = 1; i <= 27; i++) {
        const familyCode = `FAM${String(i).padStart(3, '0')}`;
        const lastName = lastNames[i - 1];

        // Randomly assign 1 or 2 cabins
        const numCabins = Math.random() > 0.7 ? 2 : 1;

        const cabinAccounts = [];
        const cabinNumbers = [];

        // Generate Cabin 1
        const cabin1Num = `A${100 + i}`;
        const cabin1Cost = 3500 + Math.random() * 1000;
        cabinAccounts.push(generateCabinData(cabin1Num, cabin1Cost));
        cabinNumbers.push(cabin1Num);

        // Generate Cabin 2 (if applicable)
        if (numCabins === 2) {
            const cabin2Num = `A${100 + i + 100}`; // Example: A201
            const cabin2Cost = 3500 + Math.random() * 1000;
            cabinAccounts.push(generateCabinData(cabin2Num, cabin2Cost));
            cabinNumbers.push(cabin2Num);
        }

        // Calculate Global Totals
        const totalCadGlobal = cabinAccounts.reduce((sum, cabin) => sum + cabin.totalCad, 0);
        const paidCadGlobal = cabinAccounts.reduce((sum, cabin) => sum + cabin.paidCad, 0);
        const subtotalCadGlobal = cabinAccounts.reduce((sum, cabin) => sum + cabin.subtotalCad, 0);
        const gratuitiesCadGlobal = cabinAccounts.reduce((sum, cabin) => sum + cabin.gratuitiesCad, 0);
        const balanceCadGlobal = Number((totalCadGlobal - paidCadGlobal).toFixed(2));

        families.push({
            id: familyCode.toLowerCase(),
            groupId: 'default',
            familyCode,
            displayName: `Familia ${lastName}`,
            email: `fam${String(i).padStart(3, '0')}@example.com`, // We will use real emails in prod

            // New Multi-Cabin Structure
            cabinAccounts,
            cabinNumbers,

            // Global Aggregates (for easy access in dashboards)
            subtotalCadGlobal: Number(subtotalCadGlobal.toFixed(2)),
            gratuitiesCadGlobal: Number(gratuitiesCadGlobal.toFixed(2)),
            totalCadGlobal: Number(totalCadGlobal.toFixed(2)),
            paidCadGlobal: Number(paidCadGlobal.toFixed(2)),
            balanceCadGlobal,

            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    return families;
}

// Main seed function
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seed (Phase 2 - Multi Cabin)...\n');

        // Create group
        console.log('Creating group...');
        await db.collection('groups').doc('default').set(groupData);
        console.log('✓ Group created\n');

        // Create families
        console.log('Creating 27 families with multi-cabin structure...');
        const families = generateFamilies();
        const batch = db.batch();

        families.forEach(family => {
            const familyRef = db.collection('families').doc(family.id);
            batch.set(familyRef, family);
        });

        await batch.commit();
        console.log('✓ 27 families updated with cabinAccounts\n');

        console.log('✅ Database seeded successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run seed
seedDatabase();
