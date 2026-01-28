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

/**
 * Create a new agency in Firestore
 * @param {Object} agencyData - Agency information
 * @param {string} agencyData.id - Unique agency ID (e.g., 'agency_xyz')
 * @param {string} agencyData.name - Agency name
 * @param {string} agencyData.billingEmail - Billing email
 * @param {string} [agencyData.logoUrl] - Logo URL (optional)
 * @param {Object} [agencyData.branding] - Branding colors (optional)
 */
async function createAgency(agencyData) {
    try {
        const {
            id,
            name,
            billingEmail,
            logoUrl = '',
            branding = {
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                navbarBackground: '#ffffff'
            }
        } = agencyData;

        // Validate required fields
        if (!id || !name || !billingEmail) {
            throw new Error('Missing required fields: id, name, and billingEmail are required');
        }

        // Check if agency already exists
        const agencyRef = db.collection('agencies').doc(id);
        const agencyDoc = await agencyRef.get();

        if (agencyDoc.exists) {
            throw new Error(`Agency with ID "${id}" already exists`);
        }

        // Create agency document
        await agencyRef.set({
            id,
            name,
            billingEmail,
            logoUrl,
            branding,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Agency created successfully!`);
        console.log(`   ID: ${id}`);
        console.log(`   Name: ${name}`);
        console.log(`   Billing Email: ${billingEmail}`);

        return { success: true, agencyId: id };

    } catch (error) {
        console.error('❌ Error creating agency:', error.message);
        throw error;
    }
}

// CLI Usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log(`
📋 Usage: node scripts/createAgency.cjs <id> <name> <billingEmail> [logoUrl] [primaryColor] [secondaryColor]

Examples:
  node scripts/createAgency.cjs agency_viajes "Viajes Especiales" admin@viajes.com
  node scripts/createAgency.cjs agency_tours "Tours Premium" contact@tours.com "" "#FF5722" "#FFC107"

Arguments:
  id              Unique agency ID (e.g., agency_xyz)
  name            Agency display name
  billingEmail    Billing contact email
  logoUrl         Logo URL (optional)
  primaryColor    Primary brand color (optional, default: #007bff)
  secondaryColor  Secondary brand color (optional, default: #6c757d)
        `);
        process.exit(1);
    }

    const [id, name, billingEmail, logoUrl, primaryColor, secondaryColor] = args;

    const agencyData = {
        id,
        name,
        billingEmail,
        logoUrl: logoUrl || '',
        branding: {
            primaryColor: primaryColor || '#007bff',
            secondaryColor: secondaryColor || '#6c757d',
            navbarBackground: '#ffffff'
        }
    };

    createAgency(agencyData)
        .then(() => {
            console.log('\n🎉 Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Failed:', error.message);
            process.exit(1);
        });
}

module.exports = { createAgency };
