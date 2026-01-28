const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Rate limiting helper
 * Limits: 20 imports per agency per day
 */
async function checkRateLimit(agencyId) {
    const today = new Date().toISOString().split('T')[0];
    const rateLimitRef = db.collection('rateLimits')
        .doc(`${agencyId}_${today}`);

    const doc = await rateLimitRef.get();
    const currentCount = doc.exists ? doc.data().count : 0;

    const MAX_IMPORTS_PER_DAY = 20;

    if (currentCount >= MAX_IMPORTS_PER_DAY) {
        throw new HttpsError(
            'resource-exhausted',
            `Has excedido el límite de ${MAX_IMPORTS_PER_DAY} importaciones por día`
        );
    }

    // Increment counter
    await rateLimitRef.set({
        count: currentCount + 1,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

/**
 * Parse cruise confirmation PDF text using Gemini AI
 */
exports.parseCruiseConfirmationPdf = onCall({
    secrets: ['GEMINI_API_KEY'],
    enforceAppCheck: false, // Set to true if you have App Check configured
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
}, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }

    const uid = request.auth.uid;

    // 2. Get user data and verify role
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data();
    const { role, agencyId } = userData;

    // Verify user has admin or agent role
    if (role !== 'admin' && role !== 'agent') {
        throw new HttpsError(
            'permission-denied',
            'No tienes permisos para importar confirmaciones'
        );
    }

    if (!agencyId) {
        throw new HttpsError(
            'failed-precondition',
            'Usuario no tiene agencia asignada'
        );
    }

    // 3. Rate limiting
    try {
        await checkRateLimit(agencyId);
    } catch (error) {
        throw error;
    }

    // 4. Validate input
    const { extractedText, hints } = request.data;

    if (!extractedText || typeof extractedText !== 'string') {
        throw new HttpsError('invalid-argument', 'extractedText es requerido');
    }

    if (extractedText.length < 50) {
        return {
            success: false,
            warning: 'scanned_pdf',
            message: 'El PDF parece estar escaneado o no contiene suficiente texto'
        };
    }

    // 5. Call Gemini AI
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent output
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            }
        });

        // Build prompt with schema
        const prompt = `
Analiza el siguiente texto de confirmación de crucero y extrae la información en formato JSON ESTRICTO.

${hints ? `PISTAS (usa si son útiles):
${JSON.stringify(hints, null, 2)}
` : ''}

TEXTO DE CONFIRMACIÓN:
${extractedText}

INSTRUCCIONES:
1. Extrae SOLO información que esté claramente visible en el texto
2. Si un campo no está disponible, usa null
3. Los nombres de pasajeros y fechas de nacimiento son OPCIONALES
4. Responde SOLO con JSON válido, sin texto adicional

SCHEMA JSON REQUERIDO:
{
  "groupMeta": {
    "confirmationNumber": "string o null",
    "cruiseLine": "string o null (ej: MSC, Royal Caribbean)",
    "shipName": "string o null",
    "sailDate": "YYYY-MM-DD o null"
  },
  "cabins": [
    {
      "number": "string o null",
      "type": "string o null (ej: Interior, Balcony, Suite)",
      "deck": "string o null",
      "passengers": [
        {
          "firstName": "string o null",
          "lastName": "string o null",
          "dateOfBirth": "YYYY-MM-DD o null",
          "age": number o null
        }
      ],
      "pricing": {
        "subtotal": number o null,
        "gratuities": number o null,
        "total": number o null,
        "currency": "string o null (ej: CAD, USD)"
      }
    }
  ],
  "confidence": number (0-100, tu estimación de confianza),
  "warnings": ["array de strings con advertencias si las hay"]
}

Responde SOLO con el JSON, sin markdown ni texto adicional.
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let jsonText = response.text().trim();

        // Clean up response (remove markdown code blocks if present)
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw response:', jsonText);
            throw new HttpsError(
                'internal',
                'Error al parsear respuesta de IA. Intenta de nuevo.'
            );
        }

        // Validate basic structure
        if (!parsed.groupMeta || !parsed.cabins) {
            throw new HttpsError(
                'internal',
                'Respuesta de IA incompleta. Intenta de nuevo.'
            );
        }

        // Return successful result
        return {
            success: true,
            data: parsed,
            metadata: {
                importSource: 'pdf',
                importedAt: new Date().toISOString(),
                importedByUid: uid,
                agencyId: agencyId
            }
        };

    } catch (error) {
        console.error('Gemini API error:', error);

        if (error instanceof HttpsError) {
            throw error;
        }

        return {
            success: false,
            error: 'gemini_failed',
            message: 'Error al procesar con IA. Por favor intenta de nuevo.',
            retryable: true
        };
    }
});

// ============================================
// Stripe Billing Functions
// ============================================

const { createCheckoutSession } = require('./src/stripe/createCheckoutSession');
const { createCustomerPortalSession } = require('./src/stripe/createCustomerPortalSession');
const { stripeWebhook } = require('./src/stripe/webhook');

exports.createCheckoutSession = createCheckoutSession;
exports.createCustomerPortalSession = createCustomerPortalSession;
exports.stripeWebhook = stripeWebhook;
