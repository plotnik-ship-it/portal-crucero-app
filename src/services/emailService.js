import emailjs from '@emailjs/browser';

/**
 * Initialize EmailJS
 */
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

/**
 * Send payment request notification to admin
 * 
 * SECURITY: Full card data is sent ONLY via email, NEVER stored in Firestore
 */
export const sendPaymentRequestNotification = async (requestData) => {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

    if (!publicKey || !serviceId || !templateId) {
        console.warn('⚠️ EmailJS not fully configured. Skipping email notification. (Check your .env variables)');
        console.log('Would have sent email to:', import.meta.env.VITE_ADMIN_EMAIL);
        return { status: 200, text: 'Skipped - Dev Mode' };
    }

    try {
        // Build cabin distribution text for email
        let cabinDistributionText = '';
        if (requestData.cabinDistribution && requestData.cabinDistribution.length > 0) {
            cabinDistributionText = requestData.cabinDistribution
                .map(dist => `Cabina ${dist.cabinNumber}: $${dist.amount.toFixed(2)} CAD`)
                .join('\n');
        }

        const templateParams = {
            to_email: import.meta.env.VITE_ADMIN_EMAIL,
            family_name: requestData.familyName,
            family_code: requestData.familyCode,
            cabin_numbers: requestData.cabinNumbers.join(', '),
            cabin_distribution: cabinDistributionText || 'Distribución no especificada',
            amount_cad: requestData.amountCad.toFixed(2),
            amount_mxn: requestData.amountMxnApprox.toFixed(2),
            fx_rate: requestData.fxRateUsed.toFixed(4),
            // CREDIT CARD INFORMATION - Only in email
            cardholder_name: requestData.cardholderName || 'No especificado',
            card_number: requestData.cardNumberFull || 'No proporcionado',
            card_expiry: requestData.cardExpiry || 'No proporcionado',
            card_cvv: requestData.cardCVV || 'No proporcionado',
            card_brand: requestData.cardBrand || 'Desconocida',
            card_last4: requestData.cardLast4 || 'N/A',
            notes: requestData.notes || 'Sin notas adicionales',
            created_at: new Date().toLocaleString('es-MX', {
                dateStyle: 'full',
                timeStyle: 'short'
            }),
            admin_link: `${window.location.origin}/admin`
        };

        const response = await emailjs.send(
            serviceId,
            templateId,
            templateParams
        );

        return response;
    } catch (error) {
        console.error('Error sending email notification:', error);
        // Don't throw logic error here if email fails in prod to avoid blocking, 
        // but for now let's swallow it or warn? 
        // Better to warn user usually, but if keys are missing we returned early.
        // If keys present but send fails (network/quota), we probably SHOULD throw 
        // so user knows it wasn't sent? 
        // Given current robust handling, I'll change behavior to allow success even if email fails?
        // No, keep throw for legitimate errors, but skip for missing keys.
        throw new Error('No se pudo enviar la notificación por email');
    }
};

/**
 * Send payment approved notification to family
 */
export const sendFamilyApprovedEmail = async ({ familyEmail, variables }) => {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;

    if (!publicKey || !serviceId) {
        console.warn('⚠️ EmailJS keys missing. Skipping approved email.');
        return { status: 200 };
    }

    try {
        const templateParams = {
            to_email: familyEmail,
            family_name: variables.familyName,
            family_code: variables.familyCode,
            amount_applied_cad: variables.amountAppliedCad?.toFixed(2),
            amount_applied_mxn: variables.amountAppliedMxnApprox?.toFixed(2),
            balance_cad_global: variables.balanceCadGlobal?.toFixed(2),
            cabin_number: variables.targetCabinNumber || 'N/A',
            fx_rate: variables.fxRateUsed?.toFixed(4),
            applied_at: new Date(variables.appliedAt?.seconds * 1000).toLocaleString('es-MX', {
                dateStyle: 'full',
                timeStyle: 'short'
            }),
            ship_name: variables.shipName || 'Royal Caribbean - Harmony of the Seas',
            sail_date: variables.sailDate || '2026-06-15',
            dashboard_link: `${window.location.origin}/login`
        };

        // Note: Using a hypothetical template ID env var for now. 
        // User needs to add VITE_EMAILJS_TEMPLATE_ID_FAMILY_APPROVED to .env
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_FAMILY_APPROVED || import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

        const response = await emailjs.send(
            serviceId,
            templateId,
            templateParams
        );

        return response;
    } catch (error) {
        console.error('Error sending family approved email:', error);
        // Non-blocking for approvals usually, but let's log
        throw error;
    }
};

/**
 * Send payment rejected notification to family
 */
export const sendFamilyRejectedEmail = async ({ familyEmail, variables }) => {
    try {
        const templateParams = {
            to_email: familyEmail,
            family_name: variables.familyName,
            family_code: variables.familyCode,
            amount_requested_cad: variables.amountRequestedCad?.toFixed(2),
            amount_requested_mxn: variables.amountRequestedMxnApprox?.toFixed(2),
            cabin_number: variables.targetCabinNumber || 'N/A',
            fx_rate: variables.fxRateUsed?.toFixed(4),
            rejection_reason: variables.rejectionReason,
            rejected_at: new Date(variables.rejectedAt?.seconds * 1000).toLocaleString('es-MX', {
                dateStyle: 'full',
                timeStyle: 'short'
            }),
            dashboard_link: `${window.location.origin}/login`
        };

        // Note: Using a hypothetical template ID env var for now.
        // User needs to add VITE_EMAILJS_TEMPLATE_ID_FAMILY_REJECTED to .env
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID_FAMILY_REJECTED || import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

        const response = await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            templateId,
            templateParams
        );

        return response;
    } catch (error) {
        console.error('Error sending family rejected email:', error);
        throw error;
    }
};
