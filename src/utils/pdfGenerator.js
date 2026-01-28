import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 * Generate a professional invoice PDF
 * @param {Object} invoiceData - Invoice data from Firestore
 * @param {Object} agencyBranding - Agency branding (logo, colors, contact info)
 * @param {string} language - Language code ('es' or 'en')
 * @returns {Promise<jsPDF>} - PDF document
 */
export const generateInvoicePDF = async (invoiceData, agencyBranding = {}, language = 'es') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPos = 20;

    // Translations
    const t = language === 'es' ? {
        invoice: 'RECIBO DE PAGO',
        invoiceNo: 'No. Recibo',
        date: 'Fecha de Emisión',
        passengerInfo: 'Información del Pasajero',
        name: 'Nombre',
        email: 'Email',
        bookingCode: 'Código',
        cabins: 'Cabinas',
        cruiseInfo: 'Información del Crucero',
        ship: 'Barco',
        sailDate: 'Fecha de Salida',
        itinerary: 'Itinerario',
        paymentDetails: 'Detalles de Pagos',
        date: 'Fecha',
        cabin: 'Cabina',
        method: 'Método',
        reference: 'Referencia',
        amount: 'Monto',
        subtotal: 'Subtotal',
        taxes: 'Impuestos',
        total: 'TOTAL',
        footer: 'Gracias por su pago. Este recibo es un comprobante oficial de pago.',
        questions: 'Para cualquier pregunta, contáctenos'
    } : {
        invoice: 'PAYMENT RECEIPT',
        invoiceNo: 'Receipt No.',
        date: 'Issue Date',
        passengerInfo: 'Passenger Information',
        name: 'Name',
        email: 'Email',
        bookingCode: 'Code',
        cabins: 'Cabins',
        cruiseInfo: 'Cruise Information',
        ship: 'Ship',
        sailDate: 'Sail Date',
        itinerary: 'Itinerary',
        paymentDetails: 'Payment Details',
        date: 'Date',
        cabin: 'Cabin',
        method: 'Method',
        reference: 'Reference',
        amount: 'Amount',
        subtotal: 'Subtotal',
        taxes: 'Taxes',
        total: 'TOTAL',
        footer: 'Thank you for your payment. This receipt is an official proof of payment.',
        questions: 'For any questions, contact us'
    };

    // Colors
    const primaryColor = agencyBranding.primaryColor || [41, 128, 185]; // Blue
    const secondaryColor = agencyBranding.secondaryColor || [52, 73, 94]; // Dark gray
    const lightGray = [240, 240, 240];

    // Header with agency logo (if provided)
    if (agencyBranding.logoUrl) {
        console.log('🖼️ Attempting to load logo:', agencyBranding.logoUrl);
        try {
            // Load image
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = agencyBranding.logoUrl;

            await new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('✅ Logo loaded successfully:', img.width, 'x', img.height);
                    resolve();
                };
                img.onerror = (err) => {
                    console.error('❌ Logo failed to load:', err);
                    reject(err);
                };
                // Timeout in case image fails to load
                setTimeout(() => {
                    console.warn('⏱️ Logo loading timeout');
                    resolve();
                }, 3000);
            });

            // Only add image if it actually loaded
            if (img.complete && img.naturalWidth > 0) {
                // Calculate aspect ratio to fit within max width/height
                const maxLogoWidth = 60;
                const maxLogoHeight = 25;
                let logoWidth = img.width;
                let logoHeight = img.height;

                // Resize logic
                const ratio = Math.min(maxLogoWidth / logoWidth, maxLogoHeight / logoHeight);
                logoWidth *= ratio;
                logoHeight *= ratio;

                // Center logo
                const xPos = (pageWidth - logoWidth) / 2;

                // Add image to PDF
                doc.addImage(img, 'PNG', xPos, yPos, logoWidth, logoHeight);
                console.log('✅ Logo added to PDF');

                yPos += logoHeight + 5;
            } else {
                console.warn('⚠️ Logo did not load properly, skipping');
                yPos += 10;
            }
        } catch (error) {
            console.error('❌ Error adding logo to PDF:', error);
            // Fallback to text if logo fails
            yPos += 10;
        }
    } else {
        console.log('ℹ️ No logo URL provided');
        yPos += 15;
    }

    // Agency name (only if no logo or as supplement, but usually logo replaces name header)
    // If we have a logo, we might skip the big name header or make it smaller.
    // Let's keep it but maybe smaller if logo exists? Or just keep as is for now.
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(agencyBranding.name || 'Travel Point', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Agency contact info
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

    yPos += 10;

    // Invoice title
    doc.setFontSize(18);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(t.invoice, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Invoice number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const invoiceInfo = [
        `${t.invoiceNo}: ${invoiceData.invoiceNumber}`,
        `${t.date}: ${formatDate(invoiceData.issuedAt)}`
    ];

    invoiceInfo.forEach(line => {
        doc.text(line, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
    });

    yPos += 5;

    // Passenger Information Box
    doc.setFillColor(...lightGray);
    doc.rect(15, yPos, pageWidth - 30, 30, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.passengerInfo, 20, yPos + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    let infoY = yPos + 13;
    doc.text(`${t.name}: ${invoiceData.passengerInfo.name}`, 20, infoY);
    infoY += 5;
    doc.text(`${t.email}: ${invoiceData.passengerInfo.email}`, 20, infoY);
    infoY += 5;
    doc.text(`${t.bookingCode}: ${invoiceData.passengerInfo.bookingCode}`, 20, infoY);
    doc.text(`${t.cabins}: ${invoiceData.passengerInfo.cabinNumbers.join(', ')}`, pageWidth / 2, infoY);

    yPos += 35;

    // Cruise Information (if available)
    if (invoiceData.cruiseInfo) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t.cruiseInfo, 20, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        doc.text(`${t.ship}: ${invoiceData.cruiseInfo.shipName}`, 20, yPos);
        yPos += 5;
        if (invoiceData.cruiseInfo.sailDate) {
            doc.text(`${t.sailDate}: ${formatDate(invoiceData.cruiseInfo.sailDate)}`, 20, yPos);
            yPos += 5;
        }
        if (invoiceData.cruiseInfo.itinerary) {
            // Use splitTextToSize to wrap long itinerary text
            const maxWidth = pageWidth - 40; // Leave margins
            const itineraryText = `${t.itinerary}: ${invoiceData.cruiseInfo.itinerary}`;
            const lines = doc.splitTextToSize(itineraryText, maxWidth);

            lines.forEach((line, index) => {
                doc.text(line, 20, yPos);
                yPos += 5;
            });
        }

        yPos += 5;
    }

    // Payment Details Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(t.paymentDetails, 20, yPos);
    yPos += 5;

    // Prepare table data
    const tableData = invoiceData.payments.map(payment => [
        formatDate(payment.date),
        payment.cabinNumber,
        payment.method,
        payment.reference || '-',
        formatCurrency(payment.amount, payment.currency)
    ]);

    // Add table
    autoTable(doc, {
        startY: yPos,
        head: [[t.date, t.cabin, t.method, t.reference, t.amount]],
        body: tableData,
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
            4: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Totals section
    const totalsX = pageWidth - 70;
    const totalsWidth = 50;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Subtotal
    doc.text(t.subtotal + ':', totalsX, yPos);
    doc.text(formatCurrency(invoiceData.subtotal, invoiceData.currency), totalsX + totalsWidth, yPos, { align: 'right' });
    yPos += 6;

    // Taxes
    doc.text(t.taxes + ':', totalsX, yPos);
    doc.text(formatCurrency(invoiceData.taxes, invoiceData.currency), totalsX + totalsWidth, yPos, { align: 'right' });
    yPos += 8;

    // Total (highlighted)
    doc.setFillColor(...primaryColor);
    doc.rect(totalsX - 5, yPos - 5, totalsWidth + 10, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(t.total + ':', totalsX, yPos);
    doc.text(formatCurrency(invoiceData.total, invoiceData.currency), totalsX + totalsWidth, yPos, { align: 'right' });

    // Footer
    yPos = pageHeight - 30;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(t.footer, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    if (agencyBranding.email) {
        doc.text(`${t.questions}: ${agencyBranding.email}`, pageWidth / 2, yPos, { align: 'center' });
    }

    // Page number
    doc.setFontSize(8);
    doc.text(`${invoiceData.invoiceNumber} - ${formatDate(new Date())}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return doc;
};

/**
 * Download invoice PDF
 * @param {Object} invoiceData - Invoice data
 * @param {Object} agencyBranding - Agency branding
 * @param {string} language - Language code
 */
export const downloadInvoicePDF = async (invoiceData, agencyBranding, language = 'es') => {
    const doc = await generateInvoicePDF(invoiceData, agencyBranding, language);
    doc.save(`${invoiceData.invoiceNumber}.pdf`);
};

/**
 * Get invoice PDF as blob (for email attachments or storage)
 * @param {Object} invoiceData - Invoice data
 * @param {Object} agencyBranding - Agency branding
 * @param {string} language - Language code
 * @returns {Blob} - PDF blob
 */
export const getInvoicePDFBlob = async (invoiceData, agencyBranding, language = 'es') => {
    const doc = await generateInvoicePDF(invoiceData, agencyBranding, language);
    return doc.output('blob');
};
