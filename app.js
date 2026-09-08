/**
 * app.js - Application Logic & UI Controller
 * UK Tax Document Management PWA
 */

(function () {
  'use strict';

  // Global UI State
  let currentScannedResult = null;
  let activeEditingDocId = null;
  let allStoredDocuments = [];

  // DOM Elements
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const offlineBadge = document.getElementById('offlineBadge');

  const cameraInput = document.getElementById('cameraInput');
  const fileInput = document.getElementById('fileInput');
  const btnManualAdd = document.getElementById('btnManualAdd');

  const ocrStatus = document.getElementById('ocrStatus');
  const ocrStatusText = document.getElementById('ocrStatusText');
  const ocrProgressBar = document.getElementById('ocrProgressBar');

  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');

  const reviewCard = document.getElementById('reviewCard');
  const docTypeBadge = document.getElementById('docTypeBadge');
  const docTypeSelect = document.getElementById('docTypeSelect');
  const dynamicFields = document.getElementById('dynamicFields');
  const reviewForm = document.getElementById('reviewForm');
  const btnCancelReview = document.getElementById('btnCancelReview');

  const searchInput = document.getElementById('searchInput');
  const filterTaxYear = document.getElementById('filterTaxYear');
  const filterDocType = document.getElementById('filterDocType');
  const recordsList = document.getElementById('recordsList');

  const analyticsTaxYear = document.getElementById('analyticsTaxYear');

  const detailModal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const btnModalClose = document.getElementById('btnModalClose');
  const btnModalSave = document.getElementById('btnModalSave');
  const btnModalDelete = document.getElementById('btnModalDelete');
  const btnModalCancel = document.getElementById('btnModalCancel');

  const toast = document.getElementById('toast');

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  async function initApp() {
    setupOfflineListener();
    setupNavigation();
    setupImageHandlers();
    setupReviewForm();
    setupFilters();
    setupModal();
    registerServiceWorker();

    await loadDocumentsAndRender();
  }

  /* Offline Indicator */
  function setupOfflineListener() {
    function updateStatus() {
      if (!navigator.onLine) {
        offlineBadge.classList.remove('hidden');
      } else {
        offlineBadge.classList.add('hidden');
      }
    }
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  /* Toast Notification */
  function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  /* Tab Navigation */
  function setupNavigation() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');

        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        if (targetTab === 'analyticsTab') {
          TaxAnalytics.renderAnalytics(allStoredDocuments, analyticsTaxYear.value);
        } else if (targetTab === 'historyTab') {
          renderRecordsList();
        }
      });
    });
  }

  /* Load Documents & Update Tax Year Filters */
  async function loadDocumentsAndRender() {
    try {
      allStoredDocuments = await TaxDB.getAllDocuments();
      populateTaxYearDropdowns();
      renderRecordsList();
      if (document.getElementById('analyticsTab').classList.contains('active')) {
        TaxAnalytics.renderAnalytics(allStoredDocuments, analyticsTaxYear.value);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      showToast('Error loading saved documents.');
    }
  }

  function populateTaxYearDropdowns() {
    const yearsSet = new Set();
    // Default current tax year
    yearsSet.add(TaxDB.getTaxYear(new Date()));

    allStoredDocuments.forEach(doc => {
      if (doc.taxYear) yearsSet.add(doc.taxYear);
    });

    const sortedYears = Array.from(yearsSet).sort().reverse();

    // Populate filterTaxYear & analyticsTaxYear
    [filterTaxYear, analyticsTaxYear].forEach(select => {
      const currentVal = select.value || 'all';
      select.innerHTML = '<option value="all">All Tax Years</option>';
      sortedYears.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = `Tax Year ${year}`;
        select.appendChild(opt);
      });
      select.value = currentVal;
    });
  }

  /* Image Input & OCR Handling */
  function setupImageHandlers() {
    cameraInput.addEventListener('change', e => handleImageFile(e.target.files[0]));
    fileInput.addEventListener('change', e => handleImageFile(e.target.files[0]));

    btnManualAdd.addEventListener('click', () => {
      imagePreviewContainer.classList.add('hidden');
      ocrStatus.classList.add('hidden');
      currentScannedResult = null;
      docTypeSelect.value = 'payslip';
      renderReviewFormFields('payslip', {});
      reviewCard.classList.remove('hidden');
      reviewCard.scrollIntoView({ behavior: 'smooth' });
    });
  }

  async function handleImageFile(file) {
    if (!file) return;

    // Show image preview
    const imageUrl = URL.createObjectURL(file);
    imagePreview.src = imageUrl;
    imagePreviewContainer.classList.remove('hidden');

    // Show OCR status
    ocrStatus.classList.remove('hidden');
    ocrStatusText.textContent = 'Initializing OCR engine...';
    ocrProgressBar.style.width = '10%';
    reviewCard.classList.add('hidden');

    try {
      const result = await TaxOCR.processImage(file, progress => {
        if (progress.status && progress.progress) {
          ocrStatusText.textContent = `${progress.status} (${Math.round(progress.progress * 100)}%)`;
          ocrProgressBar.style.width = `${Math.round(progress.progress * 100)}%`;
        }
      });

      ocrStatus.classList.add('hidden');
      showToast('OCR processing complete!');

      currentScannedResult = result;
      docTypeSelect.value = result.autoDetectedType;
      renderReviewFormFields(result.autoDetectedType, result.parsedData);
      reviewCard.classList.remove('hidden');
      reviewCard.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      console.error('OCR Error:', err);
      ocrStatus.classList.add('hidden');
      showToast('OCR failed. You can still enter details manually.');

      // Fallback manual form
      docTypeSelect.value = 'payslip';
      renderReviewFormFields('payslip', {});
      reviewCard.classList.remove('hidden');
    }
  }

  /* Setup Review Form and Dynamic Field Renderer */
  function setupReviewForm() {
    docTypeSelect.addEventListener('change', () => {
      const selectedType = docTypeSelect.value;
      const parsedData = currentScannedResult ? currentScannedResult.parsedData : {};
      renderReviewFormFields(selectedType, parsedData);
    });

    btnCancelReview.addEventListener('click', () => {
      reviewCard.classList.add('hidden');
      imagePreviewContainer.classList.add('hidden');
      cameraInput.value = '';
      fileInput.value = '';
    });

    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(reviewForm);
      const docType = docTypeSelect.value;

      const record = {
        docType: docType
      };

      formData.forEach((value, key) => {
        // Convert monetary or numeric fields to numbers
        if (['grossPay', 'netPay', 'taxPaid', 'nationalInsurance', 'pension', 'studentLoan', 'otherDeductions', 'totalPay', 'totalTax', 'totalPayToDate', 'totalTaxToDate', 'totalBenefits', 'companyCar', 'privateMedical', 'relocation', 'fuelAllowance'].includes(key)) {
          record[key] = parseFloat(value) || 0;
        } else if (key === 'studentLoanDeduction') {
          record[key] = value === 'true' || value === 'on';
        } else {
          record[key] = value;
        }
      });

      // Special itemized benefits structure for P11D
      if (docType === 'p11d') {
        record.itemizedBenefits = {
          companyCar: record.companyCar || 0,
          privateMedical: record.privateMedical || 0,
          relocation: record.relocation || 0,
          fuelAllowance: record.fuelAllowance || 0
        };
      }

      // Calculate tax year
      const targetDate = record.payDate || record.leavingDate || new Date();
      record.taxYear = record.taxYear || TaxDB.getTaxYear(targetDate);

      try {
        await TaxDB.saveDocument(record);
        showToast('Document saved successfully!');
        reviewCard.classList.add('hidden');
        imagePreviewContainer.classList.add('hidden');
        cameraInput.value = '';
        fileInput.value = '';
        currentScannedResult = null;

        await loadDocumentsAndRender();
      } catch (err) {
        console.error('Error saving document:', err);
        showToast('Failed to save document.');
      }
    });
  }

  /**
   * Render dynamic form fields based on Document Type
   */
  function renderReviewFormFields(docType, data = {}) {
    docTypeBadge.textContent = docType.toUpperCase();
    docTypeBadge.className = `badge badge-${docType}`;

    let html = '';

    if (docType === 'payslip') {
      html = `
        <div class="form-group">
          <label for="f_payDate">Pay Date *</label>
          <input type="date" id="f_payDate" name="payDate" class="form-control" value="${data.payDate || new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label for="f_employerName">Employer Name</label>
          <input type="text" id="f_employerName" name="employerName" class="form-control" value="${data.employerName || ''}" placeholder="e.g. ACME UK Ltd">
        </div>
        <div class="form-group">
          <label for="f_employeeName">Employee Name</label>
          <input type="text" id="f_employeeName" name="employeeName" class="form-control" value="${data.employeeName || ''}" placeholder="e.g. Jane Doe">
        </div>
        <div class="form-group">
          <label for="f_grossPay">Gross Pay (£) *</label>
          <input type="number" step="0.01" id="f_grossPay" name="grossPay" class="form-control" value="${data.grossPay || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_netPay">Net Pay (£) *</label>
          <input type="number" step="0.01" id="f_netPay" name="netPay" class="form-control" value="${data.netPay || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_taxPaid">Tax Paid / PAYE (£)</label>
          <input type="number" step="0.01" id="f_taxPaid" name="taxPaid" class="form-control" value="${data.taxPaid || 0}">
        </div>
        <div class="form-group">
          <label for="f_nationalInsurance">National Insurance (£)</label>
          <input type="number" step="0.01" id="f_nationalInsurance" name="nationalInsurance" class="form-control" value="${data.nationalInsurance || 0}">
        </div>
        <div class="form-group">
          <label for="f_pension">Pension Contribution (£)</label>
          <input type="number" step="0.01" id="f_pension" name="pension" class="form-control" value="${data.pension || 0}">
        </div>
        <div class="form-group">
          <label for="f_studentLoan">Student Loan (£)</label>
          <input type="number" step="0.01" id="f_studentLoan" name="studentLoan" class="form-control" value="${data.studentLoan || 0}">
        </div>
        <div class="form-group">
          <label for="f_otherDeductions">Other Deductions (£)</label>
          <input type="number" step="0.01" id="f_otherDeductions" name="otherDeductions" class="form-control" value="${data.otherDeductions || 0}">
        </div>
        <div class="form-group">
          <label for="f_taxCode">Tax Code</label>
          <input type="text" id="f_taxCode" name="taxCode" class="form-control" value="${data.taxCode || '1257L'}">
        </div>
        <div class="form-group">
          <label for="f_nino">NI Number (NINO)</label>
          <input type="text" id="f_nino" name="nino" class="form-control" value="${data.nino || ''}" placeholder="e.g. QQ123456A">
        </div>
        <div class="form-group">
          <label for="f_taxWeekMonth">Tax Week / Month</label>
          <input type="text" id="f_taxWeekMonth" name="taxWeekMonth" class="form-control" value="${data.taxWeekMonth || ''}" placeholder="e.g. Month 2">
        </div>
      `;
    } else if (docType === 'p60') {
      html = `
        <div class="form-group">
          <label for="f_taxYear">Tax Year *</label>
          <input type="text" id="f_taxYear" name="taxYear" class="form-control" value="${data.taxYear || TaxDB.getTaxYear(new Date())}" placeholder="2025-2026" required>
        </div>
        <div class="form-group">
          <label for="f_totalPay">Total Pay in Year (£) *</label>
          <input type="number" step="0.01" id="f_totalPay" name="totalPay" class="form-control" value="${data.totalPay || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_totalTax">Total Tax Paid (£) *</label>
          <input type="number" step="0.01" id="f_totalTax" name="totalTax" class="form-control" value="${data.totalTax || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_finalTaxCode">Final Tax Code</label>
          <input type="text" id="f_finalTaxCode" name="finalTaxCode" class="form-control" value="${data.finalTaxCode || '1257L'}">
        </div>
        <div class="form-group">
          <label for="f_nino">NI Number (NINO)</label>
          <input type="text" id="f_nino" name="nino" class="form-control" value="${data.nino || ''}">
        </div>
        <div class="form-group">
          <label for="f_employerDetails">Employer Details</label>
          <input type="text" id="f_employerDetails" name="employerDetails" class="form-control" value="${data.employerDetails || ''}">
        </div>
      `;
    } else if (docType === 'p45') {
      html = `
        <div class="form-group">
          <label for="f_leavingDate">Leaving Date *</label>
          <input type="date" id="f_leavingDate" name="leavingDate" class="form-control" value="${data.leavingDate || new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label for="f_totalPayToDate">Total Pay to Date (£) *</label>
          <input type="number" step="0.01" id="f_totalPayToDate" name="totalPayToDate" class="form-control" value="${data.totalPayToDate || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_totalTaxToDate">Total Tax to Date (£) *</label>
          <input type="number" step="0.01" id="f_totalTaxToDate" name="totalTaxToDate" class="form-control" value="${data.totalTaxToDate || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_taxCodeAtLeaving">Tax Code at Leaving</label>
          <input type="text" id="f_taxCodeAtLeaving" name="taxCodeAtLeaving" class="form-control" value="${data.taxCodeAtLeaving || '1257L'}">
        </div>
        <div class="form-group">
          <label for="f_nino">NI Number (NINO)</label>
          <input type="text" id="f_nino" name="nino" class="form-control" value="${data.nino || ''}">
        </div>
        <div class="form-group">
          <label for="f_studentLoanDeduction">Student Loan Deduction Continuing?</label>
          <select id="f_studentLoanDeduction" name="studentLoanDeduction" class="form-control">
            <option value="true" ${data.studentLoanDeduction ? 'selected' : ''}>Yes</option>
            <option value="false" ${!data.studentLoanDeduction ? 'selected' : ''}>No</option>
          </select>
        </div>
      `;
    } else if (docType === 'p11d') {
      const itemized = data.itemizedBenefits || {};
      html = `
        <div class="form-group">
          <label for="f_taxYear">Tax Year *</label>
          <input type="text" id="f_taxYear" name="taxYear" class="form-control" value="${data.taxYear || TaxDB.getTaxYear(new Date())}" placeholder="2025-2026" required>
        </div>
        <div class="form-group">
          <label for="f_totalBenefits">Total Value of Benefits (£) *</label>
          <input type="number" step="0.01" id="f_totalBenefits" name="totalBenefits" class="form-control" value="${data.totalBenefits || 0}" required>
        </div>
        <div class="form-group">
          <label for="f_companyCar">Company Car (£)</label>
          <input type="number" step="0.01" id="f_companyCar" name="companyCar" class="form-control" value="${itemized.companyCar || 0}">
        </div>
        <div class="form-group">
          <label for="f_privateMedical">Private Medical Insurance (£)</label>
          <input type="number" step="0.01" id="f_privateMedical" name="privateMedical" class="form-control" value="${itemized.privateMedical || 0}">
        </div>
        <div class="form-group">
          <label for="f_relocation">Relocation Expenses (£)</label>
          <input type="number" step="0.01" id="f_relocation" name="relocation" class="form-control" value="${itemized.relocation || 0}">
        </div>
        <div class="form-group">
          <label for="f_fuelAllowance">Fuel Allowance (£)</label>
          <input type="number" step="0.01" id="f_fuelAllowance" name="fuelAllowance" class="form-control" value="${itemized.fuelAllowance || 0}">
        </div>
      `;
    }

    dynamicFields.innerHTML = html;
  }

  /* History Filters & Record Renderer */
  function setupFilters() {
    searchInput.addEventListener('input', renderRecordsList);
    filterTaxYear.addEventListener('change', renderRecordsList);
    filterDocType.addEventListener('change', renderRecordsList);

    analyticsTaxYear.addEventListener('change', () => {
      TaxAnalytics.renderAnalytics(allStoredDocuments, analyticsTaxYear.value);
    });
  }

  function renderRecordsList() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedYear = filterTaxYear.value;
    const selectedType = filterDocType.value;

    let filtered = allStoredDocuments.filter(doc => {
      if (selectedYear !== 'all' && doc.taxYear !== selectedYear) return false;
      if (selectedType !== 'all' && doc.docType !== selectedType) return false;

      if (query) {
        const textToSearch = `${doc.docType} ${doc.employerName || ''} ${doc.employeeName || ''} ${doc.employerDetails || ''} ${doc.taxCode || doc.finalTaxCode || ''} ${doc.nino || ''} ${doc.taxYear}`.toLowerCase();
        if (!textToSearch.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      recordsList.innerHTML = `
        <div class="empty-state">
          <p>No tax documents match your criteria.</p>
        </div>
      `;
      return;
    }

    // Group documents by Tax Year
    const grouped = {};
    filtered.forEach(doc => {
      const year = doc.taxYear || 'Other';
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(doc);
    });

    let html = '';

    Object.keys(grouped).sort().reverse().forEach(year => {
      html += `<h3 style="margin-top: 1rem; color: var(--gov-blue-dark);">Tax Year ${year}</h3>`;

      grouped[year].forEach(doc => {
        let title = '';
        let amountText = '';
        let dateText = doc.payDate || doc.leavingDate || (doc.createdAt ? doc.createdAt.split('T')[0] : '');

        if (doc.docType === 'payslip') {
          title = doc.employerName ? `Payslip - ${doc.employerName}` : 'Payslip';
          amountText = `Net: ${TaxDB.formatCurrency(doc.netPay)} <br><small style="font-weight:normal; color:var(--text-muted)">Gross: ${TaxDB.formatCurrency(doc.grossPay)}</small>`;
        } else if (doc.docType === 'p60') {
          title = doc.employerDetails ? `P60 - ${doc.employerDetails}` : 'P60 Certificate';
          amountText = `Total Pay: ${TaxDB.formatCurrency(doc.totalPay)}`;
        } else if (doc.docType === 'p45') {
          title = 'P45 Leaving Certificate';
          amountText = `Pay to Date: ${TaxDB.formatCurrency(doc.totalPayToDate)}`;
        } else if (doc.docType === 'p11d') {
          title = 'P11D Benefits in Kind';
          amountText = `Benefits: ${TaxDB.formatCurrency(doc.totalBenefits)}`;
        }

        html += `
          <div class="record-item" data-id="${doc.id}">
            <div class="record-main">
              <div class="record-title">
                <span class="badge badge-${doc.docType}">${doc.docType.toUpperCase()}</span>
                <span>${title}</span>
              </div>
              <div class="record-meta">
                Date: ${dateText} | Tax Code: ${doc.taxCode || doc.finalTaxCode || doc.taxCodeAtLeaving || '1257L'}
              </div>
            </div>
            <div class="record-amount">${amountText}</div>
            <div class="record-actions">
              <button class="btn btn-outline btn-sm btn-view" data-id="${doc.id}">View / Edit</button>
            </div>
          </div>
        `;
      });
    });

    recordsList.innerHTML = html;

    // Attach click listeners to View / Edit buttons
    recordsList.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openDetailModal(id);
      });
    });
  }

  /* Detail / Edit Modal */
  function setupModal() {
    btnModalClose.addEventListener('click', closeModal);
    btnModalCancel.addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);

    btnModalDelete.addEventListener('click', async () => {
      if (activeEditingDocId && confirm('Are you sure you want to delete this tax record?')) {
        try {
          await TaxDB.deleteDocument(activeEditingDocId);
          showToast('Record deleted');
          closeModal();
          await loadDocumentsAndRender();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete record');
        }
      }
    });

    btnModalSave.addEventListener('click', async () => {
      const form = modalBody.querySelector('form');
      if (!form) return;

      const formData = new FormData(form);
      const doc = allStoredDocuments.find(d => d.id === activeEditingDocId);
      if (!doc) return;

      formData.forEach((value, key) => {
        if (['grossPay', 'netPay', 'taxPaid', 'nationalInsurance', 'pension', 'studentLoan', 'otherDeductions', 'totalPay', 'totalTax', 'totalPayToDate', 'totalTaxToDate', 'totalBenefits', 'companyCar', 'privateMedical', 'relocation', 'fuelAllowance'].includes(key)) {
          doc[key] = parseFloat(value) || 0;
        } else if (key === 'studentLoanDeduction') {
          doc[key] = value === 'true' || value === 'on';
        } else {
          doc[key] = value;
        }
      });

      if (doc.docType === 'p11d') {
        doc.itemizedBenefits = {
          companyCar: doc.companyCar || 0,
          privateMedical: doc.privateMedical || 0,
          relocation: doc.relocation || 0,
          fuelAllowance: doc.fuelAllowance || 0
        };
      }

      doc.taxYear = TaxDB.getTaxYear(doc.payDate || doc.leavingDate || doc.taxYear || new Date());

      try {
        await TaxDB.saveDocument(doc);
        showToast('Record updated successfully');
        closeModal();
        await loadDocumentsAndRender();
      } catch (err) {
        console.error(err);
        showToast('Failed to update record');
      }
    });
  }

  function openDetailModal(id) {
    const doc = allStoredDocuments.find(d => d.id === id);
    if (!doc) return;

    activeEditingDocId = id;
    modalTitle.textContent = `Edit ${doc.docType.toUpperCase()} Record`;

    // Render modal edit form
    const tempContainer = document.createElement('div');
    const form = document.createElement('form');
    form.id = 'modalEditForm';

    const fieldsGrid = document.createElement('div');
    fieldsGrid.className = 'form-grid';

    // We can reuse the render logic
    const oldDynamicFields = dynamicFields;

    // Temporary override
    modalBody.innerHTML = '';
    modalBody.appendChild(form);
    form.appendChild(fieldsGrid);

    // Call inner field generator
    let html = '';
    if (doc.docType === 'payslip') {
      html = `
        <div class="form-group"><label>Pay Date</label><input type="date" name="payDate" class="form-control" value="${doc.payDate || ''}"></div>
        <div class="form-group"><label>Employer Name</label><input type="text" name="employerName" class="form-control" value="${doc.employerName || ''}"></div>
        <div class="form-group"><label>Gross Pay (£)</label><input type="number" step="0.01" name="grossPay" class="form-control" value="${doc.grossPay || 0}"></div>
        <div class="form-group"><label>Net Pay (£)</label><input type="number" step="0.01" name="netPay" class="form-control" value="${doc.netPay || 0}"></div>
        <div class="form-group"><label>PAYE Tax (£)</label><input type="number" step="0.01" name="taxPaid" class="form-control" value="${doc.taxPaid || 0}"></div>
        <div class="form-group"><label>National Insurance (£)</label><input type="number" step="0.01" name="nationalInsurance" class="form-control" value="${doc.nationalInsurance || 0}"></div>
        <div class="form-group"><label>Pension (£)</label><input type="number" step="0.01" name="pension" class="form-control" value="${doc.pension || 0}"></div>
        <div class="form-group"><label>Student Loan (£)</label><input type="number" step="0.01" name="studentLoan" class="form-control" value="${doc.studentLoan || 0}"></div>
        <div class="form-group"><label>Tax Code</label><input type="text" name="taxCode" class="form-control" value="${doc.taxCode || '1257L'}"></div>
        <div class="form-group"><label>NINO</label><input type="text" name="nino" class="form-control" value="${doc.nino || ''}"></div>
      `;
    } else if (doc.docType === 'p60') {
      html = `
        <div class="form-group"><label>Tax Year</label><input type="text" name="taxYear" class="form-control" value="${doc.taxYear || ''}"></div>
        <div class="form-group"><label>Total Pay (£)</label><input type="number" step="0.01" name="totalPay" class="form-control" value="${doc.totalPay || 0}"></div>
        <div class="form-group"><label>Total Tax (£)</label><input type="number" step="0.01" name="totalTax" class="form-control" value="${doc.totalTax || 0}"></div>
        <div class="form-group"><label>Final Tax Code</label><input type="text" name="finalTaxCode" class="form-control" value="${doc.finalTaxCode || ''}"></div>
        <div class="form-group"><label>Employer Details</label><input type="text" name="employerDetails" class="form-control" value="${doc.employerDetails || ''}"></div>
      `;
    } else if (doc.docType === 'p45') {
      html = `
        <div class="form-group"><label>Leaving Date</label><input type="date" name="leavingDate" class="form-control" value="${doc.leavingDate || ''}"></div>
        <div class="form-group"><label>Total Pay to Date (£)</label><input type="number" step="0.01" name="totalPayToDate" class="form-control" value="${doc.totalPayToDate || 0}"></div>
        <div class="form-group"><label>Total Tax to Date (£)</label><input type="number" step="0.01" name="totalTaxToDate" class="form-control" value="${doc.totalTaxToDate || 0}"></div>
        <div class="form-group"><label>Tax Code at Leaving</label><input type="text" name="taxCodeAtLeaving" class="form-control" value="${doc.taxCodeAtLeaving || ''}"></div>
      `;
    } else if (doc.docType === 'p11d') {
      const itemized = doc.itemizedBenefits || {};
      html = `
        <div class="form-group"><label>Tax Year</label><input type="text" name="taxYear" class="form-control" value="${doc.taxYear || ''}"></div>
        <div class="form-group"><label>Total Benefits (£)</label><input type="number" step="0.01" name="totalBenefits" class="form-control" value="${doc.totalBenefits || 0}"></div>
        <div class="form-group"><label>Company Car (£)</label><input type="number" step="0.01" name="companyCar" class="form-control" value="${itemized.companyCar || 0}"></div>
        <div class="form-group"><label>Private Medical (£)</label><input type="number" step="0.01" name="privateMedical" class="form-control" value="${itemized.privateMedical || 0}"></div>
        <div class="form-group"><label>Relocation (£)</label><input type="number" step="0.01" name="relocation" class="form-control" value="${itemized.relocation || 0}"></div>
        <div class="form-group"><label>Fuel Allowance (£)</label><input type="number" step="0.01" name="fuelAllowance" class="form-control" value="${itemized.fuelAllowance || 0}"></div>
      `;
    }

    fieldsGrid.innerHTML = html;
    detailModal.classList.remove('hidden');
  }

  function closeModal() {
    detailModal.classList.add('hidden');
    activeEditingDocId = null;
  }

  /* Service Worker Registration */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
          console.log('ServiceWorker registered with scope:', reg.scope);
        }).catch(err => {
          console.error('ServiceWorker registration failed:', err);
        });
      });
    }
  }

})();
