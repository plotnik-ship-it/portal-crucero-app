import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromPDF, extractHints, validatePDFFile } from './pdfExtractor';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Process PDF confirmation using Gemini AI directly
 * @param {File} pdfFile - PDF file to process
 * @returns {Promise<Object>} Parsed confirmation data
 */
export async function processPDFConfirmation(pdfFile) {
    // Step 1: Validate file
    const validation = validatePDFFile(pdfFile);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Step 2: Extract text from PDF
    let extractedText;
    try {
        extractedText = await extractTextFromPDF(pdfFile);
    } catch (error) {
        throw new Error('Error al extraer texto del PDF: ' + error.message);
    }

    // Check if text is too short (likely scanned PDF)
    if (!extractedText || extractedText.length < 50) {
        return {
            success: false,
            warning: 'scanned_pdf',
            message: 'El PDF parece estar escaneado o no contiene texto extraíble. Por favor usa entrada manual.'
        };
    }

    // Step 3: Extract hints using regex
    const hints = extractHints(extractedText);

    // Step 4: Call Gemini AI directly
    try {
        console.log('Initializing Gemini AI with API key:', import.meta.env.VITE_GEMINI_API_KEY?.substring(0, 10) + '...');

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash', // Confirmed available in API
            generationConfig: {
                temperature: 0.1,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 8192,
            }
        });

        console.log('Gemini model initialized, sending prompt...');

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
        console.log('Gemini API response received');

        const response = result.response;
        let jsonText = response.text().trim();
        console.log('Response text length:', jsonText.length);

        // Clean up response (remove markdown code blocks if present)
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        // Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw response:', jsonText);
            throw new Error('Error al parsear respuesta de IA. Intenta de nuevo.');
        }

        // Validate basic structure
        if (!parsed.groupMeta || !parsed.cabins) {
            throw new Error('Respuesta de IA incompleta. Intenta de nuevo.');
        }

        return {
            success: true,
            data: parsed,
            metadata: {
                importSource: 'pdf',
                importedAt: new Date().toISOString(),
                confidence: parsed.confidence
            }
        };

    } catch (error) {
        console.error('Gemini API error (full):', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Error response:', error.response);

        // Show more detailed error to user
        if (error.message?.includes('404')) {
            throw new Error('Modelo de IA no disponible. Verifica tu API key de Gemini en Google AI Studio.');
        } else if (error.message?.includes('API key')) {
            throw new Error('API key de Gemini inválido. Verifica la configuración.');
        } else {
            throw new Error('Error al procesar el PDF con IA: ' + error.message);
        }
    }
}

/**
 * Save imported confirmation data to Firestore
 * @param {string} bookingId - Family ID to update
 * @param {Object} confirmationData - Parsed confirmation data
 * @param {Object} metadata - Import metadata
 * @returns {Promise<void>}
 */
export async function saveConfirmationData(bookingId, confirmationData, metadata, options = {}) {
    const { updateFamilyData, getFamilyData } = await import('./firestore');

    // Get existing family data for merge
    const existingFamily = await getFamilyData(bookingId);
    const existingCabins = existingFamily?.cabinAccounts || [];

    // Determine target cabin index
    const targetIndex = options.targetCabinIndex;

    let updatedCabins;

    if (targetIndex === 'new') {
        // Add new cabin to existing array
        console.log('📌 Adding new cabin to family');
        updatedCabins = [
            ...existingCabins,
            {
                cabinNumber: confirmationData.cabins[0].number,
                cabinType: confirmationData.cabins[0].type,
                passengers: confirmationData.cabins[0].passengers || [],
                subtotalCad: confirmationData.cabins[0].pricing?.subtotal || 0,
                gratuitiesCad: confirmationData.cabins[0].pricing?.gratuities || 0,
                totalCad: confirmationData.cabins[0].pricing?.total || 0,
                paidCad: 0,
                balanceCad: confirmationData.cabins[0].pricing?.total || 0,
                depositPaid: false
            }
        ];
    } else if (targetIndex !== undefined && targetIndex !== null && existingCabins.length > 0) {
        // Update specific cabin (MERGE - preserve paidCad and other data)
        console.log(`📌 Updating cabin at index ${targetIndex}`);
        updatedCabins = existingCabins.map((cabin, idx) => {
            if (idx === parseInt(targetIndex)) {
                const newTotal = confirmationData.cabins[0].pricing?.total || cabin.totalCad || 0;
                const existingPaid = cabin.paidCad || 0;

                return {
                    ...cabin, // Keep ALL existing data
                    cabinNumber: confirmationData.cabins[0].number || cabin.cabinNumber,
                    cabinType: confirmationData.cabins[0].type || cabin.cabinType,
                    passengers: confirmationData.cabins[0].passengers || cabin.passengers,
                    subtotalCad: confirmationData.cabins[0].pricing?.subtotal || cabin.subtotalCad,
                    gratuitiesCad: confirmationData.cabins[0].pricing?.gratuities || cabin.gratuitiesCad,
                    totalCad: newTotal,
                    // CRITICAL: Keep paidCad unchanged
                    paidCad: existingPaid,
                    balanceCad: newTotal - existingPaid,
                    // Keep depositPaid status
                    depositPaid: cabin.depositPaid || false
                };
            }
            return cabin; // Other cabins unchanged
        });
    } else {
        // Single cabin family (original behavior) or first import
        console.log('📌 Creating single cabin (original behavior)');
        updatedCabins = [{
            cabinNumber: confirmationData.cabins[0].number,
            cabinType: confirmationData.cabins[0].type,
            passengers: confirmationData.cabins[0].passengers || [],
            subtotalCad: confirmationData.cabins[0].pricing?.subtotal || 0,
            gratuitiesCad: confirmationData.cabins[0].pricing?.gratuities || 0,
            totalCad: confirmationData.cabins[0].pricing?.total || 0,
            paidCad: 0,
            balanceCad: confirmationData.cabins[0].pricing?.total || 0,
            depositPaid: false
        }];
    }

    const updateData = {
        // Group metadata (always update if provided, otherwise keep existing)
        confirmationNumber: confirmationData.groupMeta?.confirmationNumber || existingFamily?.confirmationNumber,
        cruiseLine: confirmationData.groupMeta?.cruiseLine || existingFamily?.cruiseLine,
        shipName: confirmationData.groupMeta?.shipName || existingFamily?.shipName,
        sailDate: confirmationData.groupMeta?.sailDate || existingFamily?.sailDate,

        // Cabin data (merged)
        cabinAccounts: updatedCabins,
        cabinNumbers: updatedCabins.map(c => c.cabinNumber),

        // Import metadata
        importMetadata: {
            source: metadata.importSource,
            importedAt: metadata.importedAt,
            importedBy: metadata.importedByUid,
            confidence: confirmationData.confidence,
            warnings: confirmationData.warnings || [],
            targetCabinIndex: targetIndex,
            lastImportedAt: new Date().toISOString()
        }
    };

    console.log('💾 Saving confirmation data:', {
        bookingId,
        targetIndex,
        cabinsCount: updatedCabins.length
    });

    await updateFamilyData(bookingId, updateData);
}
