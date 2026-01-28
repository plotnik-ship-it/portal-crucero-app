import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Format date for display
 */
const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) date = date.toDate();
    return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Format currency for display
 */
const formatCurrency = (amount, currency = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

/**
 * Generate a professional quotation PDF
 * @param {Object} quotationData - Quotation data from Firestore
 * @param {Object} agencyBranding - Agency branding (logo, colors, contact info)
 * @param {string} language - Language code ('es' or 'en')
 * @returns {jsPDF} - PDF document
 */
export const generateQuotationPDF = (quotationData, agencyBranding = {}, language = 'es') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Translations
    const t = language === 'es' ? {
        quotation: 'COTIZACIÓN DE CRUCERO',
        quotationNo: 'No. Cotización',
        date: 'Fecha',
        validUntil: 'Válida Hasta',
        clientInfo: 'Información del Cliente',
        name: 'Nombre',
        email: 'Email',
        phone: 'Teléfono',
        cruiseDetails: 'Detalles del Crucero',
        cruiseLine: 'Naviera',
        ship: 'Barco',
        sailDate: 'Fecha de Salida',
        duration: 'Duración',
        days: 'días',
        departurePort: 'Puerto de Salida',
        itinerary: 'Itinerario',
        day: 'Día',
        port: 'Puerto',
        arrival: 'Llegada',
        departure: 'Salida',
        atSea: 'En el Mar',
        cabinSelection: 'Selección de Cabinas',
        cabinType: 'Tipo de Cabina',
        category: 'Categoría',
        quantity: 'Cantidad',
        pricePerCabin: 'Precio por Cabina',
        subtotal: 'Subtotal',
        costBreakdown: 'Desglose de Costos',
        cabinsCost: 'Costo de Cabinas',
        gratuities: 'Propinas',
        taxes: 'Impuestos',
        insurance: 'Seguro (Opcional)',
        total: 'TOTAL',
        notes: 'Notas Importantes',
        terms: 'Términos y Condiciones',
        footer: 'Esta cotización es válida hasta la fecha indicada. Los precios están sujetos a disponibilidad y pueden cambiar sin previo aviso.',
        contact: 'Para reservar o más información, contáctenos'
    } : {
        quotation: 'CRUISE QUOTATION',
        quotationNo: 'Quotation No.',
        date: 'Date',
        validUntil: 'Valid Until',
        clientInfo: 'Client Information',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        cruiseDetails: 'Cruise Details',
        cruiseLine: 'Cruise Line',
        ship: 'Ship',
        sailDate: 'Sail Date',
        duration: 'Duration',
        days: 'days',
        departurePort: 'Departure Port',
        itinerary: 'Itinerary',
        day: 'Day',
        port: 'Port',
        arrival: 'Arrival',
        departure: 'Departure',
        atSea: 'At Sea',
        cabinSelection: 'Cabin Selection',
        cabinType: 'Cabin Type',
        category: 'Category',
        quantity: 'Quantity',
        pricePerCabin: 'Price per Cabin',
        subtotal: 'Subtotal',
        costBreakdown: 'Cost Breakdown',
        cabinsCost: 'Cabins Cost',
        gratuities: 'Gratuities',
        taxes: 'Taxes',
        insurance: 'Insurance (Optional)',
        total: 'TOTAL',
        notes: 'Important Notes',
        terms: 'Terms and Conditions',
        footer: 'This quotation is valid until the indicated date. Prices are subject to availability and may change without notice.',
        contact: 'To book or for more information, contact us'
    };

    // Colors
    const primaryColor = agencyBranding.primaryColor || [41, 128, 185]; // Blue
    const secondaryColor = agencyBranding.secondaryColor || [52, 73, 94]; // Dark gray
    const accentColor = [46, 204, 113]; // Green
    const lightGray = [240, 240, 240];

    // Header with agency info
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(agencyBranding.name || 'Travel Point', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Agency contact
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    if (agencyBranding.email) {
        doc.text(agencyBranding.email, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
    }
    if (agencyBranding.phone) {
        doc.text(agencyBranding.phone, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
    }

    yPos += 8;

    // Quotation title
    doc.setFontSize(20);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(t.quotation, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Quotation info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const quotationInfo = [
        `${t.quotationNo}: ${quotationData.quotationNumber}`,
        `${t.date}: ${formatDate(quotationData.createdAt)}`,
        `${t.validUntil}: ${formatDate(quotationData.expiresAt)}`
    ];

    quotationInfo.forEach(line => {
        doc.text(line, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
    });

    yPos += 5;

    // Client Information Box
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 25, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.clientInfo, 20, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    let infoY = yPos + 13;
    doc.text(`${t.name}: ${quotationData.clientInfo.name}`, 20, infoY);
    infoY += 5;
    doc.text(`${t.email}: ${quotationData.clientInfo.email}`, 20, infoY);
    if (quotationData.clientInfo.phone) {
        doc.text(`${t.phone}: ${quotationData.clientInfo.phone}`, pageWidth / 2, infoY);
    }

    yPos += 30;

    // Cruise Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text(t.cruiseDetails, 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.text(`${t.cruiseLine}: ${quotationData.cruiseInfo.cruiseLine}`, 20, yPos);
    yPos += 6;
    doc.text(`${t.ship}: ${quotationData.cruiseInfo.shipName}`, 20, yPos);
    yPos += 6;
    doc.text(`${t.sailDate}: ${formatDate(quotationData.cruiseInfo.sailDate)}`, 20, yPos);
    doc.text(`${t.duration}: ${quotationData.cruiseInfo.duration} ${t.days}`, pageWidth / 2, yPos);
    yPos += 6;
    doc.text(`${t.departurePort}: ${quotationData.cruiseInfo.departurePort}`, 20, yPos);
    yPos += 8;

    // Itinerary (if available)
    if (quotationData.cruiseInfo.itinerary && quotationData.cruiseInfo.itinerary.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t.itinerary, 20, yPos);
        yPos += 5;

        // Itinerary table
        const itineraryData = quotationData.cruiseInfo.itinerary.map(day => [
            `${t.day} ${day.day}`,
            day.port || t.atSea,
            day.arrival || '-',
            day.departure || '-'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [[t.day, t.port, t.arrival, t.departure]],
            body: itineraryData,
            theme: 'grid',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8
            },
            margin: { left: 15, right: 15 }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    }

    // Cabin Selection
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text(t.cabinSelection, 20, yPos);
    yPos += 5;

    const cabinData = quotationData.cabins.map(cabin => [
        cabin.cabinType,
        cabin.cabinCategory || '-',
        cabin.quantity.toString(),
        formatCurrency(cabin.pricePerCabin, quotationData.currency),
        formatCurrency(cabin.pricePerCabin * cabin.quantity, quotationData.currency)
    ]);

    doc.autoTable({
        startY: yPos,
        head: [[t.cabinType, t.category, t.quantity, t.pricePerCabin, t.subtotal]],
        body: cabinData,
        theme: 'striped',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: {
            fontSize: 9
        },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Cost Breakdown
    const totalsX = pageWidth - 75;
    const totalsWidth = 55;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.costBreakdown, totalsX - 5, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Subtotal
    doc.text(t.cabinsCost + ':', totalsX, yPos);
    doc.text(formatCurrency(quotationData.subtotal, quotationData.currency), totalsX + totalsWidth, yPos, { align: 'right' });
    yPos += 6;

    // Gratuities
    if (quotationData.additionalCosts.gratuities > 0) {
        doc.text(t.gratuities + ':', totalsX, yPos);
        doc.text(formatCurrency(quotationData.additionalCosts.gratuities, quotationData.currency), totalsX + totalsWidth, yPos, { align: 'right' });
        yPos += 6;
    }

    // Taxes
    if (quotationData.additionalCosts.taxes > 0) {
        doc.text(t.taxes + ':', totalsX, yPos);
        doc.text(formatCurrency(quotationData.additionalCosts.taxes, quotationData.currency), totalsX + totalsWidth, yPos, { align: 'right' });
        yPos += 6;
    }

    // Insurance
    if (quotationData.additionalCosts.insurance > 0) {
        doc.text(t.insurance + ':', totalsX, yPos);
        doc.text(formatCurrency(quotationData.additionalCosts.insurance, quotationData.currency), totalsX + totalsWidth, yPos, { align: 'right' });
        yPos += 8;
    } else {
        yPos += 2;
    }

    // Total (highlighted)
    doc.setFillColor(...accentColor);
    doc.rect(totalsX - 5, yPos - 5, totalsWidth + 10, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(t.total + ':', totalsX, yPos);
    doc.text(formatCurrency(quotationData.total, quotationData.currency), totalsX + totalsWidth, yPos, { align: 'right' });

    yPos += 15;

    // Notes (if any)
    if (quotationData.notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t.notes, 20, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const notesLines = doc.splitTextToSize(quotationData.notes, pageWidth - 40);
        doc.text(notesLines, 20, yPos);
        yPos += (notesLines.length * 5) + 5;
    }

    // Terms and Conditions (if any)
    if (quotationData.termsAndConditions) {
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t.terms, 20, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        const termsLines = doc.splitTextToSize(quotationData.termsAndConditions, pageWidth - 40);
        doc.text(termsLines, 20, yPos);
    }

    // Footer
    yPos = pageHeight - 25;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(t.footer, pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 40 });
    yPos += 5;

    if (agencyBranding.email) {
        doc.text(`${t.contact}: ${agencyBranding.email}`, pageWidth / 2, yPos, { align: 'center' });
    }

    // Page number
    doc.setFontSize(7);
    doc.text(`${quotationData.quotationNumber} - ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return doc;
};

/**
 * Download quotation PDF
 * @param {Object} quotationData - Quotation data
 * @param {Object} agencyBranding - Agency branding
 * @param {string} language - Language code
 */
export const downloadQuotationPDF = (quotationData, agencyBranding, language = 'es') => {
    const doc = generateQuotationPDF(quotationData, agencyBranding, language);
    doc.save(`${quotationData.quotationNumber}.pdf`);
};

/**
 * Get quotation PDF as blob (for email attachments or storage)
 * @param {Object} quotationData - Quotation data
 * @param {Object} agencyBranding - Agency branding
 * @param {string} language - Language code
 * @returns {Blob} - PDF blob
 */
export const getQuotationPDFBlob = (quotationData, agencyBranding, language = 'es') => {
    const doc = generateQuotationPDF(quotationData, agencyBranding, language);
    return doc.output('blob');
};
