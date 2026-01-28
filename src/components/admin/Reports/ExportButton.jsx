import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyWithLabel } from '../../../services/currencyService';

const ExportButton = ({ families, stats }) => {
    const { t } = useTranslation();
    const [exporting, setExporting] = useState(false);

    const exportToExcel = () => {
        setExporting(true);
        try {
            // Prepare data for Excel
            const data = families.map(family => ({
                'Código': family.bookingCode,
                'Nombre': family.displayName,
                'Email': family.email,
                'Cabinas': family.cabinNumbers?.join(', ') || '',
                'Total (CAD)': family.totalCadGlobal || 0,
                'Pagado (CAD)': family.paidCadGlobal || 0,
                'Saldo (CAD)': family.balanceCadGlobal || 0,
                'Depósito': family.cabinAccounts?.some(c => c.depositPaid) ? 'Sí' : 'No'
            }));

            // Add summary row
            data.push({});
            data.push({
                'Código': 'TOTALES',
                'Nombre': '',
                'Email': '',
                'Cabinas': '',
                'Total (CAD)': stats.totalSales,
                'Pagado (CAD)': stats.totalPaid,
                'Saldo (CAD)': stats.totalBalance,
                'Depósito': `${stats.withDeposit}/${stats.totalFamilies}`
            });

            // Create workbook
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

            // Set column widths
            ws['!cols'] = [
                { wch: 10 },  // Código
                { wch: 25 },  // Nombre
                { wch: 30 },  // Email
                { wch: 15 },  // Cabinas
                { wch: 15 },  // Total
                { wch: 15 },  // Pagado
                { wch: 15 },  // Saldo
                { wch: 10 }   // Depósito
            ];

            // Generate filename with date
            const date = new Date().toISOString().split('T')[0];
            const filename = `Reporte_Familias_${date}.xlsx`;

            // Download
            XLSX.writeFile(wb, filename);

            alert('✅ Reporte exportado exitosamente');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('❌ Error al exportar el reporte');
        } finally {
            setExporting(false);
        }
    };

    const exportToPDF = () => {
        setExporting(true);
        try {
            const doc = new jsPDF();

            // Title
            doc.setFontSize(18);
            doc.text('Reporte de Familias', 14, 20);

            // Date
            doc.setFontSize(10);
            const date = new Date().toLocaleDateString('es-MX');
            doc.text(`Fecha: ${date}`, 14, 28);

            // Summary statistics
            doc.setFontSize(12);
            doc.text('Resumen:', 14, 38);
            doc.setFontSize(10);
            doc.text(`Total Familias: ${stats.totalFamilies}`, 14, 45);
            doc.text(`Total Ventas: ${formatCurrencyWithLabel(stats.totalSales)}`, 14, 52);
            doc.text(`Total Pagado: ${formatCurrencyWithLabel(stats.totalPaid)}`, 14, 59);
            doc.text(`Saldo Pendiente: ${formatCurrencyWithLabel(stats.totalBalance)}`, 14, 66);

            // Table data
            const tableData = families.map(family => [
                family.bookingCode,
                family.displayName,
                formatCurrencyWithLabel(family.totalCadGlobal || 0),
                formatCurrencyWithLabel(family.paidCadGlobal || 0),
                formatCurrencyWithLabel(family.balanceCadGlobal || 0)
            ]);

            // Add table
            autoTable(doc, {
                startY: 75,
                head: [['Código', 'Nombre', 'Total', 'Pagado', 'Saldo']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] }
            });

            // Generate filename with date
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `Reporte_Familias_${dateStr}.pdf`;

            // Download
            doc.save(filename);

            alert('✅ PDF generado exitosamente');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('❌ Error al generar el PDF');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="flex gap-md">
            <button
                onClick={exportToExcel}
                disabled={exporting}
                className="btn btn-success"
            >
                📊 {t('admin.exportExcel')}
            </button>
            <button
                onClick={exportToPDF}
                disabled={exporting}
                className="btn btn-primary"
            >
                📄 {t('admin.exportPDF')}
            </button>
        </div>
    );
};

export default ExportButton;
