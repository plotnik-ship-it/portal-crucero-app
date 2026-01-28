/**
 * Export Service
 * Handles exporting data to Excel and PDF formats
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export families to Excel
 * @param {Array} families - Array of family objects
 * @param {string} groupName - Name of the group
 */
export const exportFamiliesToExcel = (families, groupName = 'Grupo') => {
    try {
        const data = families.map(f => ({
            'Código': f.bookingCode || '',
            'Nombre': f.displayName || '',
            'Email': f.email || '',
            'Cabinas': f.cabinNumbers?.join(', ') || '',
            'Total (CAD)': f.totalCadGlobal || 0,
            'Pagado (CAD)': f.paidCadGlobal || 0,
            'Saldo (CAD)': f.balanceCadGlobal || 0,
            'Depósito': f.cabinAccounts?.some(c => c.depositPaid) ? 'Sí' : 'No'
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        const colWidths = [
            { wch: 10 }, // Código
            { wch: 25 }, // Nombre
            { wch: 30 }, // Email
            { wch: 15 }, // Cabinas
            { wch: 15 }, // Total
            { wch: 15 }, // Pagado
            { wch: 15 }, // Saldo
            { wch: 10 }  // Depósito
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Familias');

        const fileName = `${groupName.replace(/\s+/g, '_')}_Familias_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        return { success: true, fileName };
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export families to PDF
 * @param {Array} families - Array of family objects
 * @param {string} groupName - Name of the group
 */
export const exportFamiliesToPDF = (families, groupName = 'Grupo') => {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175); // Primary color
        doc.text(`Reporte de Familias - ${groupName}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`, 14, 30);

        // Summary stats
        const totalSales = families.reduce((sum, f) => sum + (f.totalCadGlobal || 0), 0);
        const totalPaid = families.reduce((sum, f) => sum + (f.paidCadGlobal || 0), 0);
        const totalBalance = families.reduce((sum, f) => sum + (f.balanceCadGlobal || 0), 0);

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Familias: ${families.length}`, 14, 38);
        doc.text(`Total Ventas: $${totalSales.toFixed(2)} CAD`, 14, 44);
        doc.text(`Total Pagado: $${totalPaid.toFixed(2)} CAD`, 14, 50);
        doc.text(`Saldo Pendiente: $${totalBalance.toFixed(2)} CAD`, 14, 56);

        // Table data
        const tableData = families.map(f => [
            f.bookingCode || '',
            f.displayName || '',
            f.cabinNumbers?.join(', ') || '',
            `$${(f.totalCadGlobal || 0).toFixed(2)}`,
            `$${(f.paidCadGlobal || 0).toFixed(2)}`,
            `$${(f.balanceCadGlobal || 0).toFixed(2)}`
        ]);

        doc.autoTable({
            head: [['Código', 'Nombre', 'Cabinas', 'Total', 'Pagado', 'Saldo']],
            body: tableData,
            startY: 62,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 40 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' },
                5: { cellWidth: 30, halign: 'right' }
            }
        });

        const fileName = `${groupName.replace(/\s+/g, '_')}_Familias_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        return { success: true, fileName };
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export payment history to Excel
 * @param {Array} payments - Array of payment objects
 * @param {string} groupName - Name of the group
 */
export const exportPaymentsToExcel = (payments, groupName = 'Grupo') => {
    try {
        const data = payments.map(p => ({
            'Fecha': p.date?.toDate ? p.date.toDate().toLocaleDateString('es-MX') : '',
            'Familia': p.familyName || '',
            'Código': p.bookingCode || '',
            'Monto (CAD)': p.amountCad || 0,
            'Método': p.method || '',
            'Referencia': p.reference || '',
            'Nota': p.note || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        const colWidths = [
            { wch: 12 }, // Fecha
            { wch: 25 }, // Familia
            { wch: 10 }, // Código
            { wch: 15 }, // Monto
            { wch: 15 }, // Método
            { wch: 20 }, // Referencia
            { wch: 30 }  // Nota
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

        const fileName = `${groupName.replace(/\s+/g, '_')}_Pagos_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        return { success: true, fileName };
    } catch (error) {
        console.error('Error exporting payments to Excel:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export analytics summary to PDF
 * @param {Object} analytics - Analytics data object
 * @param {string} groupName - Name of the group
 */
export const exportAnalyticsToPDF = (analytics, groupName = 'Grupo') => {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(30, 64, 175);
        doc.text(`Analytics Dashboard - ${groupName}`, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`, 14, 30);

        // Financial Summary
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumen Financiero', 14, 45);

        doc.setFontSize(11);
        const metrics = [
            ['Total Ventas:', `$${analytics.totalSales.toFixed(2)} CAD`],
            ['Total Pagado:', `$${analytics.totalPaid.toFixed(2)} CAD`],
            ['Saldo Pendiente:', `$${analytics.totalBalance.toFixed(2)} CAD`],
            ['Progreso de Pago:', `${analytics.paymentProgress.paid.toFixed(1)}%`]
        ];

        let yPos = 55;
        metrics.forEach(([label, value]) => {
            doc.setTextColor(100, 100, 100);
            doc.text(label, 14, yPos);
            doc.setTextColor(0, 0, 0);
            doc.text(value, 80, yPos);
            yPos += 8;
        });

        // Family Statistics
        doc.setFontSize(14);
        yPos += 10;
        doc.text('Estadísticas de Familias', 14, yPos);

        doc.setFontSize(11);
        yPos += 10;
        const familyStats = [
            ['Total Familias:', analytics.familiesCount.toString()],
            ['Familias al Día:', analytics.familiesUpToDate.toString()],
            ['Familias con Saldo:', analytics.familiesBehind.toString()],
            ['Con Depósito:', analytics.depositStats.withDeposit.toString()],
            ['Sin Depósito:', analytics.depositStats.withoutDeposit.toString()]
        ];

        familyStats.forEach(([label, value]) => {
            doc.setTextColor(100, 100, 100);
            doc.text(label, 14, yPos);
            doc.setTextColor(0, 0, 0);
            doc.text(value, 80, yPos);
            yPos += 8;
        });

        // Top Debtors Table
        if (analytics.topDebtors && analytics.topDebtors.length > 0) {
            doc.setFontSize(14);
            yPos += 10;
            doc.text('Top 10 - Mayor Saldo Pendiente', 14, yPos);

            const tableData = analytics.topDebtors.map((f, index) => [
                (index + 1).toString(),
                f.bookingCode,
                f.displayName,
                `$${f.balance.toFixed(2)}`
            ]);

            doc.autoTable({
                head: [['#', 'Código', 'Nombre', 'Saldo']],
                body: tableData,
                startY: yPos + 5,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [30, 64, 175], textColor: 255 },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
        }

        const fileName = `${groupName.replace(/\s+/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        return { success: true, fileName };
    } catch (error) {
        console.error('Error exporting analytics to PDF:', error);
        return { success: false, error: error.message };
    }
};
