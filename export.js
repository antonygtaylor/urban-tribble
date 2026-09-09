/**
 * export.js - CSV and XLSX Spreadsheet Exporter
 * UK Tax Document Management PWA
 */

(function (global) {
  'use strict';

  /**
   * Prepares structured array of row objects for export
   * @param {Array} documents
   * @returns {Array<Object>}
   */
  function prepareExportData(documents) {
    if (!Array.isArray(documents)) return [];

    return documents.map(doc => {
      const type = (doc.docType || 'payslip').toUpperCase();
      const isDup = doc.isDuplicate ? 'Yes' : 'No';
      let date = doc.payDate || doc.leavingDate || '';
      if (!date && doc.createdAt) {
        date = doc.createdAt.split('T')[0];
      }

      const taxYear = doc.taxYear || '';
      const employer = doc.employerName || doc.employerDetails || '';
      const employee = doc.employeeName || '';
      const nino = doc.nino || '';
      const taxCode = doc.taxCode || doc.finalTaxCode || doc.taxCodeAtLeaving || '1257L';

      const gross = Number(doc.grossPay || doc.totalPay || doc.totalPayToDate || 0);
      const tax = Number(doc.taxPaid || doc.totalTax || doc.totalTaxToDate || 0);
      const ni = Number(doc.nationalInsurance || 0);
      const pension = Number(doc.pension || 0);
      const studentLoan = Number(doc.studentLoan || 0);
      const otherDed = Number(doc.otherDeductions || 0);
      const net = Number(doc.netPay || (gross - tax - ni - pension - studentLoan - otherDed));
      const benefits = Number(doc.totalBenefits || 0);

      return {
        'Document Type': type,
        'Duplicate Flag': isDup,
        'Tax Year': taxYear,
        'Date': date,
        'Employer': employer,
        'Employee Name': employee,
        'NINO': nino,
        'Tax Code': taxCode,
        'Gross / Total Pay (£)': gross,
        'PAYE Tax (£)': tax,
        'National Insurance (£)': ni,
        'Pension (£)': pension,
        'Student Loan (£)': studentLoan,
        'Other Deductions (£)': otherDed,
        'Net Pay (£)': net,
        'P11D Benefits Value (£)': benefits
      };
    });
  }

  /**
   * Downloads data as CSV file
   * @param {Array} documents
   * @param {string} filename Default 'UK_Tax_Documents.csv'
   */
  function exportToCSV(documents, filename = 'UK_Tax_Documents.csv') {
    const data = prepareExportData(documents);
    if (data.length === 0) {
      alert('No documents available to export.');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    // Data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header] !== undefined ? row[header] : '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    triggerBlobDownload(blob, filename);
  }

  /**
   * Downloads data as XLSX Excel File using SheetJS
   * @param {Array} documents
   * @param {string} filename Default 'UK_Tax_Documents.xlsx'
   */
  function exportToXLSX(documents, filename = 'UK_Tax_Documents.xlsx') {
    if (typeof XLSX === 'undefined') {
      console.warn('SheetJS XLSX library not loaded, falling back to CSV export.');
      exportToCSV(documents, filename.replace('.xlsx', '.csv'));
      return;
    }

    const data = prepareExportData(documents);
    if (data.length === 0) {
      alert('No documents available to export.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Records');

    XLSX.writeFile(workbook, filename);
  }

  /**
   * Helper to trigger browser Blob download
   */
  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export
  global.TaxExport = {
    prepareExportData,
    exportToCSV,
    exportToXLSX
  };

})(typeof window !== 'undefined' ? window : globalThis);
