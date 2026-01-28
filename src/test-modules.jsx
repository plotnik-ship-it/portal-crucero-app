/**
 * Test file to verify all new invoice and quotation modules compile correctly
 * This file imports all new components and services to check for errors
 */

// Invoice Module
import {
    generateInvoice,
    getInvoicesByFamily,
    getInvoiceById,
    getInvoicesByAgency,
    updateInvoiceStatus,
    deleteInvoice
} from './services/invoiceService';

import {
    generateInvoicePDF,
    downloadInvoicePDF,
    getInvoicePDFBlob
} from './utils/pdfGenerator';

import InvoiceList from './components/family/InvoiceList';
import AdminInvoiceManager from './components/admin/AdminInvoiceManager';

// Quotation Module
import {
    createQuotation,
    getQuotationsByAgency,
    getQuotationById,
    updateQuotation,
    updateQuotationStatus,
    deleteQuotation
} from './services/quotationService';

import {
    generateQuotationPDF,
    downloadQuotationPDF,
    getQuotationPDFBlob
} from './utils/quotationPdfGenerator';

import QuotationBuilder from './components/admin/QuotationBuilder';
import QuotationManager from './components/admin/QuotationManager';

console.log('✅ All invoice and quotation modules imported successfully!');

// Export a dummy component to satisfy module requirements
export default function ModulesTest() {
    return (
        <div>
            <h1>Invoice and Quotation Modules Test</h1>
            <p>All modules imported successfully!</p>

            {/* Invoice Components */}
            <InvoiceList bookingId="test" familyData={{}} agencyBranding={{}} />
            <AdminInvoiceManager agencyId="test" />

            {/* Quotation Components */}
            <QuotationBuilder agencyId="test" onClose={() => { }} />
            <QuotationManager agencyId="test" />
        </div>
    );
}
