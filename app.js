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
  let recordsViewMode = 'cards';
  let isAnalyticsTableVisible = false;

  // Step-Through Recall State
  let recallPayslipsList = [];
  let currentRecallIndex = 0;

  // Script Loader Cache
  const loadedScripts = {};

  /**
   * Dynamically loads a script on-demand
   */
  function loadScript(src) {
    if (loadedScripts[src]) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedScripts[src] = true;
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * HTML Sanitizer to prevent XSS exploits
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // DOM Elements
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const offlineBadge = document.getElementById('offlineBadge');

  // Mismatch Alert Banner
  const mismatchBanner = document.getElementById('mismatchBanner');
  const mismatchMessage = document.getElementById('mismatchMessage');
  const btnDismissMismatch = document.getElementById('btnDismissMismatch');

  // Overview Tab
  const ovTotalDocs = document.getElementById('ovTotalDocs');
  const ovTotalEmployers = document.getElementById('ovTotalEmployers');
  const ovTotalNet = document.getElementById('ovTotalNet');
  const ovTotalTax = document.getElementById('ovTotalTax');
  const btnOverviewScan = document.getElementById('btnOverviewScan');
  const btnOverviewRecall = document.getElementById('btnOverviewRecall');
  const overviewEmployersList = document.getElementById('overviewEmployersList');

  // Scan & Form
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

  // Records / History
  const searchInput = document.getElementById('searchInput');
  const filterTaxYear = document.getElementById('filterTaxYear');
  const filterEmployer = document.getElementById('filterEmployer');
  const filterDocType = document.getElementById('filterDocType');
  const recordsList = document.getElementById('recordsList');
  const btnViewCards = document.getElementById('btnViewCards');
  const btnViewTable = document.getElementById('btnViewTable');
  const btnRecordsRecall = document.getElementById('btnRecordsRecall');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportXLSX = document.getElementById('btnExportXLSX');

  // Analytics
  const analyticsTaxYear = document.getElementById('analyticsTaxYear');
  const btnToggleAnalyticsTable = document.getElementById('btnToggleAnalyticsTable');
  const btnExportAnalyticsCSV = document.getElementById('btnExportAnalyticsCSV');
  const btnExportAnalyticsXLSX = document.getElementById('btnExportAnalyticsXLSX');
  const analyticsTableContainer = document.getElementById('analyticsTableContainer');
  const analyticsTableContent = document.getElementById('analyticsTableContent');

  // Step-Through Recall Modal
  const recallModal = document.getElementById('recallModal');
  const recallStepIndicator = document.getElementById('recallStepIndicator');
  const payslipSheet = document.getElementById('payslipSheet');
  const btnPrevPayslip = document.getElementById('btnPrevPayslip');
  const btnNextPayslip = document.getElementById('btnNextPayslip');
  const btnRecallClose = document.getElementById('btnRecallClose');
  const btnRecallDone = document.getElementById('btnRecallDone');

  // Modal & Toast
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
    setupOverviewControls();
    setupImageHandlers();
    setupReviewForm();
    setupFiltersAndViewToggles();
    setupExportHandlers();
    setupRecallViewer();
    setupModal();
    setupMismatchBanner();
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

  /* Navigation Tabs */
  function setupNavigation() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  async function switchTab(targetTabId) {
    navTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeTabBtn = document.querySelector(`.nav-tab[data-tab="${targetTabId}"]`);
    if (activeTabBtn) activeTabBtn.classList.add('active');

    const activeContent = document.getElementById(targetTabId);
    if (activeContent) activeContent.classList.add('active');

    if (targetTabId === 'overviewTab') {
      renderOverviewTab();
    } else if (targetTabId === 'analyticsTab') {
      // Lazy load Chart.js when entering Analytics tab
      if (typeof Chart === 'undefined') {
        await loadScript('vendor/chart.min.js');
      }
      TaxAnalytics.renderAnalytics(allStoredDocuments, analyticsTaxYear.value);
      if (isAnalyticsTableVisible) renderAnalyticsTable();
    } else if (targetTabId === 'historyTab') {
      renderRecordsList();
    }
  }

  /* Overview Controls */
  function setupOverviewControls() {
    if (btnOverviewScan) {
      btnOverviewScan.addEventListener('click', () => switchTab('scanTab'));
    }
    if (btnOverviewRecall) {
      btnOverviewRecall.addEventListener('click', () => openPayslipRecallViewer());
    }
    if (btnRecordsRecall) {
      btnRecordsRecall.addEventListener('click', () => openPayslipRecallViewer());
    }
  }

  /* Export Handlers */
  function setupExportHandlers() {
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        TaxExport.exportToCSV(allStoredDocuments);
        showToast('CSV export downloaded');
      });
    }
    if (btnExportXLSX) {
      btnExportXLSX.addEventListener('click', async () => {
        if (typeof XLSX === 'undefined') {
          await loadScript('vendor/xlsx.min.js');
        }
        TaxExport.exportToXLSX(allStoredDocuments);
        showToast('XLSX export downloaded');
      });
    }
    if (btnExportAnalyticsCSV) {
      btnExportAnalyticsCSV.addEventListener('click', () => {
        TaxExport.exportToCSV(allStoredDocuments);
        showToast('CSV export downloaded');
      });
    }
    if (btnExportAnalyticsXLSX) {
      btnExportAnalyticsXLSX.addEventListener('click', async () => {
        if (typeof XLSX === 'undefined') {
          await loadScript('vendor/xlsx.min.js');
        }
        TaxExport.exportToXLSX(allStoredDocuments);
        showToast('XLSX export downloaded');
      });
    }
  }

  /* Load Documents & Check Mismatches */
  async function loadDocumentsAndRender() {
    try {
      allStoredDocuments = await TaxDB.getAllDocuments();
      populateDropdownFilters();
      renderOverviewTab();
      renderRecordsList();
      checkAndShowEmployeeMismatches();

      if (document.getElementById('analyticsTab').classList.contains('active')) {
        if (typeof Chart === 'undefined') {
          await loadScript('vendor/chart.min.js');
        }
        TaxAnalytics.renderAnalytics(allStoredDocuments, analyticsTaxYear.value);
        if (isAnalyticsTableVisible) renderAnalyticsTable();
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      showToast('Error loading saved documents.');
    }
  }

  /* Employee Mismatch Banner */
  function setupMismatchBanner() {
    btnDismissMismatch.addEventListener('click', () => {
      mismatchBanner.classList.add('hidden');
    });
  }

  function checkAndShowEmployeeMismatches() {
    if (allStoredDocuments.length < 2) {
      mismatchBanner.classList.add('hidden');
      return;
    }

    const employeeNames = new Set();
    const ninos = new Set();

    allStoredDocuments.forEach(doc => {
      if (doc.employeeName && doc.employeeName.trim()) {
        employeeNames.add(doc.employeeName.trim());
      }
      if (doc.nino && doc.nino.trim()) {
        ninos.add(doc.nino.trim().toUpperCase());
      }
    });

    let mismatchFound = false;
    let mismatchText = '';
    let mismatchKey = '';

    if (employeeNames.size > 1) {
      const namesList = Array.from(employeeNames).join(' vs ');
      mismatchKey = `mismatch_names_${namesList}`;
      mismatchText = `Multiple employee names detected across documents: (${namesList}).`;
      mismatchFound = true;
    } else if (ninos.size > 1) {
      const ninoList = Array.from(ninos).join(' vs ');
      mismatchKey = `mismatch_nino_${ninoList}`;
      mismatchText = `Multiple National Insurance numbers detected across documents: (${ninoList}).`;
      mismatchFound = true;
    }

    if (mismatchFound) {
      const shownMismatches = JSON.parse(localStorage.getItem('shown_mismatches') || '[]');
      if (!shownMismatches.includes(mismatchKey)) {
        mismatchMessage.textContent = mismatchText;
        mismatchBanner.classList.remove('hidden');

        shownMismatches.push(mismatchKey);
        localStorage.setItem('shown_mismatches', JSON.stringify(shownMismatches));
      }
    } else {
      mismatchBanner.classList.add('hidden');
    }
  }

  /* Overview Dashboard Renderer */
  function renderOverviewTab() {
    ovTotalDocs.textContent = allStoredDocuments.length;

    const employersSet = new Set();
    let totalNet = 0;
    let totalTax = 0;

    const employerGroups = {};

    allStoredDocuments.forEach(doc => {
      if (doc.isDuplicate) return;

      const empName = doc.employerName || doc.employerDetails || 'Unknown Employer';
      employersSet.add(empName);

      if (!employerGroups[empName]) {
        employerGroups[empName] = { count: 0, net: 0, docs: [] };
      }
      employerGroups[empName].count++;
      employerGroups[empName].docs.push(doc);

      if (doc.docType === 'payslip') {
        totalNet += Number(doc.netPay || 0);
        totalTax += Number(doc.taxPaid || 0);
      } else if (doc.docType === 'p60') {
        totalTax += Number(doc.totalTax || 0);
      }
    });

    ovTotalEmployers.textContent = employersSet.size;
    ovTotalNet.textContent = TaxDB.formatCurrency(totalNet);
    ovTotalTax.textContent = TaxDB.formatCurrency(totalTax);

    if (Object.keys(employerGroups).length === 0) {
      overviewEmployersList.innerHTML = `
        <div class="empty-state">
          <p>No documents uploaded yet. Click "+ Add New Document" above to get started.</p>
        </div>
      `;
      return;
    }

    let empHtml = '';
    Object.keys(employerGroups).forEach(emp => {
      const group = employerGroups[emp];
      const safeEmp = escapeHTML(emp);
      empHtml += `
        <div class="employer-card">
          <div>
            <div class="employer-name">${safeEmp}</div>
            <div class="employer-stats">${group.count} record(s)</div>
          </div>
          <button class="btn btn-outline btn-sm btn-filter-employer" data-employer="${safeEmp}">
            View Records
          </button>
        </div>
      `;
    });

    overviewEmployersList.innerHTML = empHtml;

    overviewEmployersList.querySelectorAll('.btn-filter-employer').forEach(btn => {
      btn.addEventListener('click', e => {
        const emp = e.target.getAttribute('data-employer');
        filterEmployer.value = emp;
        switchTab('historyTab');
      });
    });
  }

  /* Populate Dropdowns */
  function populateDropdownFilters() {
    const yearsSet = new Set();
    const employersSet = new Set();

    yearsSet.add(TaxDB.getTaxYear(new Date()));

    allStoredDocuments.forEach(doc => {
      if (doc.taxYear) yearsSet.add(doc.taxYear);
      const emp = doc.employerName || doc.employerDetails;
      if (emp) employersSet.add(emp);
    });

    const sortedYears = Array.from(yearsSet).sort().reverse();
    const sortedEmployers = Array.from(employersSet).sort();

    [filterTaxYear, analyticsTaxYear].forEach(select => {
      const currentVal = select.value || 'all';
      select.innerHTML = '<option value="all">All Tax Years</option>';
      sortedYears.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = `Tax Year ${escapeHTML(year)}`;
        select.appendChild(opt);
      });
      select.value = currentVal;
    });

    const currentEmpVal = filterEmployer.value || 'all';
    filterEmployer.innerHTML = '<option value="all">All Employers</option>';
    sortedEmployers.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp;
      opt.textContent = emp;
      filterEmployer.appendChild(opt);
    });
    filterEmployer.value = currentEmpVal;
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

    // Lazy load Tesseract.js when user picks an image
    if (typeof Tesseract === 'undefined') {
      await loadScript('vendor/tesseract.min.js');
    }

    const imageUrl = URL.createObjectURL(file);
    imagePreview.src = imageUrl;
    imagePreviewContainer.classList.remove('hidden');

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

      docTypeSelect.value = 'payslip';
      renderReviewFormFields('payslip', {});
      reviewCard.classList.remove('hidden');
    }
  }

  /* Review Form */
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

      const record = { docType: docType };

      formData.forEach((value, key) => {
        if (['grossPay', 'netPay', 'taxPaid', 'nationalInsurance', 'pension', 'studentLoan', 'otherDeductions', 'totalPay', 'totalTax', 'totalPayToDate', 'totalTaxToDate', 'totalBenefits', 'companyCar', 'privateMedical', 'relocation', 'fuelAllowance'].includes(key)) {
          record[key] = parseFloat(value) || 0;
        } else if (key === 'studentLoanDeduction') {
          record[key] = value === 'true' || value === 'on';
        } else {
          record[key] = value;
        }
      });

      if (docType === 'p11d') {
        record.itemizedBenefits = {
          companyCar: record.companyCar || 0,
          privateMedical: record.privateMedical || 0,
          relocation: record.relocation || 0,
          fuelAllowance: record.fuelAllowance || 0
        };
      }

      const targetDate = record.payDate || record.leavingDate || new Date();
      record.taxYear = record.taxYear || TaxDB.getTaxYear(targetDate);

      const isDup = TaxDB.isDuplicateRecord(record, allStoredDocuments);
      if (isDup) {
        record.isDuplicate = true;
        showToast('Duplicate record detected - marked and excluded from sums.');
      }

      try {
        await TaxDB.saveDocument(record);
        if (!isDup) showToast('Document saved successfully!');
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

  function renderReviewFormFields(docType, data = {}) {
    docTypeBadge.textContent = docType.toUpperCase();
    docTypeBadge.className = `badge badge-${docType}`;

    let html = '';

    if (docType === 'payslip') {
      html = `
        <div class="form-group">
          <label for="f_payDate">Pay Date *</label>
          <input type="date" id="f_payDate" name="payDate" class="form-control" value="${escapeHTML(data.payDate || new Date().toISOString().split('T')[0])}" required>
        </div>
        <div class="form-group">
          <label for="f_employerName">Employer Name</label>
          <input type="text" id="f_employerName" name="employerName" class="form-control" value="${escapeHTML(data.employerName || '')}" placeholder="e.g. ACME UK Ltd">
        </div>
        <div class="form-group">
          <label for="f_employeeName">Employee Name</label>
          <input type="text" id="f_employeeName" name="employeeName" class="form-control" value="${escapeHTML(data.employeeName || '')}" placeholder="e.g. Jane Doe">
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
          <input type="text" id="f_taxCode" name="taxCode" class="form-control" value="${escapeHTML(data.taxCode || '1257L')}">
        </div>
        <div class="form-group">
          <label for="f_nino">NI Number (NINO)</label>
          <input type="text" id="f_nino" name="nino" class="form-control" value="${escapeHTML(data.nino || '')}" placeholder="e.g. QQ123456A">
        </div>
        <div class="form-group">
          <label for="f_taxWeekMonth">Tax Week / Month</label>
          <input type="text" id="f_taxWeekMonth" name="taxWeekMonth" class="form-control" value="${escapeHTML(data.taxWeekMonth || '')}" placeholder="e.g. Month 2">
        </div>
      `;
    } else if (docType === 'p60') {
      html = `
        <div class="form-group">
          <label for="f_taxYear">Tax Year *</label>
          <input type="text" id="f_taxYear" name="taxYear" class="form-control" value="${escapeHTML(data.taxYear || TaxDB.getTaxYear(new Date()))}" placeholder="2025-2026" required>
        </div>
        <div class="form-group">
          <label for="f_employerName">Employer Details</label>
          <input type="text" id="f_employerName" name="employerName" class="form-control" value="${escapeHTML(data.employerName || data.employerDetails || '')}">
        </div>
        <div class="form-group">
          <label for="f_employeeName">Employee Name</label>
          <input type="text" id="f_employeeName" name="employeeName" class="form-control" value="${escapeHTML(data.employeeName || '')}">
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
          <input type="text" id="f_finalTaxCode" name="finalTaxCode" class="form-control" value="${escapeHTML(data.finalTaxCode || '1257L')}">
        </div>
        <div class="form-group">
          <label for="f_nino">NI Number (NINO)</label>
          <input type="text" id="f_nino" name="nino" class="form-control" value="${escapeHTML(data.nino || '')}">
        </div>
      `;
    } else if (docType === 'p45') {
      html = `
        <div class="form-group">
          <label for="f_leavingDate">Leaving Date *</label>
          <input type="date" id="f_leavingDate" name="leavingDate" class="form-control" value="${escapeHTML(data.leavingDate || new Date().toISOString().split('T')[0])}" required>
        </div>
        <div class="form-group">
          <label for="f_employerName">Employer Name</label>
          <input type="text" id="f_employerName" name="employerName" class="form-control" value="${escapeHTML(data.employerName || '')}">
        </div>
        <div class="form-group">
          <label for="f_employeeName">Employee Name</label>
          <input type="text" id="f_employeeName" name="employeeName" class="form-control" value="${escapeHTML(data.employeeName || '')}">
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
          <input type="text" id="f_taxCodeAtLeaving" name="taxCodeAtLeaving" class="form-control" value="${escapeHTML(data.taxCodeAtLeaving || '1257L')}">
        </div>
        <div class="form-group">
          <label for="f_nino">NI Number (NINO)</label>
          <input type="text" id="f_nino" name="nino" class="form-control" value="${escapeHTML(data.nino || '')}">
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
          <input type="text" id="f_taxYear" name="taxYear" class="form-control" value="${escapeHTML(data.taxYear || TaxDB.getTaxYear(new Date()))}" placeholder="2025-2026" required>
        </div>
        <div class="form-group">
          <label for="f_employerName">Employer Name</label>
          <input type="text" id="f_employerName" name="employerName" class="form-control" value="${escapeHTML(data.employerName || '')}">
        </div>
        <div class="form-group">
          <label for="f_employeeName">Employee Name</label>
          <input type="text" id="f_employeeName" name="employeeName" class="form-control" value="${escapeHTML(data.employeeName || '')}">
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

  /* Filters & View Toggles */
  function setupFiltersAndViewToggles() {
    searchInput.addEventListener('input', renderRecordsList);
    filterTaxYear.addEventListener('change', renderRecordsList);
    filterEmployer.addEventListener('change', renderRecordsList);
    filterDocType.addEventListener('change', renderRecordsList);

    btnViewCards.addEventListener('click', () => {
      recordsViewMode = 'cards';
      btnViewCards.classList.add('active');
      btnViewTable.classList.remove('active');
      renderRecordsList();
    });

    btnViewTable.addEventListener('click', () => {
      recordsViewMode = 'table';
      btnViewTable.classList.add('active');
      btnViewCards.classList.remove('active');
      renderRecordsList();
    });

    analyticsTaxYear.addEventListener('change', async () => {
      if (typeof Chart === 'undefined') {
        await loadScript('vendor/chart.min.js');
      }
      TaxAnalytics.renderAnalytics(allStoredDocuments, analyticsTaxYear.value);
      if (isAnalyticsTableVisible) renderAnalyticsTable();
    });

    btnToggleAnalyticsTable.addEventListener('click', () => {
      isAnalyticsTableVisible = !isAnalyticsTableVisible;
      if (isAnalyticsTableVisible) {
        btnToggleAnalyticsTable.textContent = 'Hide Data Table';
        analyticsTableContainer.classList.remove('hidden');
        renderAnalyticsTable();
      } else {
        btnToggleAnalyticsTable.textContent = 'Show Data Table';
        analyticsTableContainer.classList.add('hidden');
      }
    });
  }

  /* Render Records List */
  function renderRecordsList() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedYear = filterTaxYear.value;
    const selectedEmp = filterEmployer.value;
    const selectedType = filterDocType.value;

    let filtered = allStoredDocuments.filter(doc => {
      if (selectedYear !== 'all' && doc.taxYear !== selectedYear) return false;
      if (selectedEmp !== 'all') {
        const emp = doc.employerName || doc.employerDetails || '';
        if (emp !== selectedEmp) return false;
      }
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

    if (recordsViewMode === 'table') {
      renderRecordsTable(filtered);
    } else {
      renderRecordsCards(filtered);
    }
  }

  function renderRecordsCards(filtered) {
    const grouped = {};
    filtered.forEach(doc => {
      const year = doc.taxYear || 'Other';
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(doc);
    });

    let html = '';

    Object.keys(grouped).sort().reverse().forEach(year => {
      html += `<h3 style="margin-top: 1rem; color: var(--gov-blue-dark);">Tax Year ${escapeHTML(year)}</h3>`;

      grouped[year].forEach(doc => {
        let title = '';
        let amountText = '';
        let dateText = doc.payDate || doc.leavingDate || (doc.createdAt ? doc.createdAt.split('T')[0] : '');

        const safeEmp = escapeHTML(doc.employerName || doc.employerDetails);
        const safeCode = escapeHTML(doc.taxCode || doc.finalTaxCode || doc.taxCodeAtLeaving || '1257L');

        if (doc.docType === 'payslip') {
          title = safeEmp ? `Payslip - ${safeEmp}` : 'Payslip';
          amountText = `Net: ${TaxDB.formatCurrency(doc.netPay)} <br><small style="font-weight:normal; color:var(--text-muted)">Gross: ${TaxDB.formatCurrency(doc.grossPay)}</small>`;
        } else if (doc.docType === 'p60') {
          title = safeEmp ? `P60 - ${safeEmp}` : 'P60 Certificate';
          amountText = `Total Pay: ${TaxDB.formatCurrency(doc.totalPay)}`;
        } else if (doc.docType === 'p45') {
          title = 'P45 Leaving Certificate';
          amountText = `Pay to Date: ${TaxDB.formatCurrency(doc.totalPayToDate)}`;
        } else if (doc.docType === 'p11d') {
          title = 'P11D Benefits in Kind';
          amountText = `Benefits: ${TaxDB.formatCurrency(doc.totalBenefits)}`;
        }

        const dupBadge = doc.isDuplicate ? '<span class="badge badge-duplicate">DUPLICATE</span>' : '';

        html += `
          <div class="record-item" data-id="${doc.id}">
            <div class="record-main">
              <div class="record-title">
                <span class="badge badge-${escapeHTML(doc.docType)}">${escapeHTML(doc.docType.toUpperCase())}</span>
                ${dupBadge}
                <span>${title}</span>
              </div>
              <div class="record-meta">
                Date: ${escapeHTML(dateText)} | Tax Code: ${safeCode}
              </div>
            </div>
            <div class="record-amount">${amountText}</div>
            <div class="record-actions">
              <button class="btn btn-outline btn-sm btn-view" data-id="${doc.id}" aria-label="View or edit document">View / Edit</button>
            </div>
          </div>
        `;
      });
    });

    recordsList.innerHTML = html;
    attachRecordActionListeners();
  }

  function renderRecordsTable(filtered) {
    let html = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date / Tax Year</th>
              <th>Employer</th>
              <th>Employee / NINO</th>
              <th>Key Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach(doc => {
      let mainAmount = '';
      if (doc.docType === 'payslip') mainAmount = `Net: ${TaxDB.formatCurrency(doc.netPay)}`;
      else if (doc.docType === 'p60') mainAmount = `Pay: ${TaxDB.formatCurrency(doc.totalPay)}`;
      else if (doc.docType === 'p45') mainAmount = `Pay to Date: ${TaxDB.formatCurrency(doc.totalPayToDate)}`;
      else if (doc.docType === 'p11d') mainAmount = `Benefits: ${TaxDB.formatCurrency(doc.totalBenefits)}`;

      const dupBadge = doc.isDuplicate ? '<span class="badge badge-duplicate">DUP</span> ' : '';

      html += `
        <tr>
          <td>${dupBadge}<span class="badge badge-${escapeHTML(doc.docType)}">${escapeHTML(doc.docType.toUpperCase())}</span></td>
          <td>${escapeHTML(doc.payDate || doc.leavingDate || doc.taxYear)}</td>
          <td>${escapeHTML(doc.employerName || doc.employerDetails || '-')}</td>
          <td>${escapeHTML(doc.employeeName || '-')} <br><small style="color:var(--text-muted)">${escapeHTML(doc.nino || '')}</small></td>
          <td><strong>${mainAmount}</strong></td>
          <td><button class="btn btn-outline btn-sm btn-view" data-id="${doc.id}" aria-label="Edit document">Edit</button></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    recordsList.innerHTML = html;
    attachRecordActionListeners();
  }

  function attachRecordActionListeners() {
    recordsList.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openDetailModal(id);
      });
    });
  }

  /* Render Analytics Data Table */
  function renderAnalyticsTable() {
    const year = analyticsTaxYear.value;
    const filteredDocs = TaxAnalytics.filterDocsByTaxYear(allStoredDocuments, year, true);

    if (filteredDocs.length === 0) {
      analyticsTableContent.innerHTML = '<p class="subtitle">No records available for this tax year.</p>';
      return;
    }

    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Employer</th>
            <th>Tax Year / Date</th>
            <th>Gross / Total Pay</th>
            <th>Tax Paid</th>
            <th>NI</th>
            <th>Net Pay</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredDocs.forEach(d => {
      const gross = d.grossPay || d.totalPay || d.totalPayToDate || 0;
      const tax = d.taxPaid || d.totalTax || d.totalTaxToDate || 0;
      const ni = d.nationalInsurance || 0;
      const net = d.netPay || (gross - tax - ni);

      html += `
        <tr>
          <td><span class="badge badge-${escapeHTML(d.docType)}">${escapeHTML(d.docType.toUpperCase())}</span></td>
          <td>${escapeHTML(d.employerName || d.employerDetails || '-')}</td>
          <td>${escapeHTML(d.payDate || d.leavingDate || d.taxYear)}</td>
          <td>${TaxDB.formatCurrency(gross)}</td>
          <td>${TaxDB.formatCurrency(tax)}</td>
          <td>${TaxDB.formatCurrency(ni)}</td>
          <td><strong>${TaxDB.formatCurrency(net)}</strong></td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    analyticsTableContent.innerHTML = html;
  }

  /* STEP-THROUGH DIGITAL PAYSLIP RECALL VIEWER CONTROLLER */
  function setupRecallViewer() {
    btnRecallClose.addEventListener('click', closeRecallViewer);
    btnRecallDone.addEventListener('click', closeRecallViewer);
    recallModal.querySelector('.modal-overlay').addEventListener('click', closeRecallViewer);

    btnPrevPayslip.addEventListener('click', () => {
      if (currentRecallIndex > 0) {
        currentRecallIndex--;
        renderCurrentPayslipSheet();
      }
    });

    btnNextPayslip.addEventListener('click', () => {
      if (currentRecallIndex < recallPayslipsList.length - 1) {
        currentRecallIndex++;
        renderCurrentPayslipSheet();
      }
    });

    window.addEventListener('keydown', e => {
      if (recallModal.classList.contains('hidden')) return;
      if (e.key === 'ArrowLeft') {
        if (currentRecallIndex > 0) {
          currentRecallIndex--;
          renderCurrentPayslipSheet();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentRecallIndex < recallPayslipsList.length - 1) {
          currentRecallIndex++;
          renderCurrentPayslipSheet();
        }
      } else if (e.key === 'Escape') {
        closeRecallViewer();
      }
    });
  }

  function openPayslipRecallViewer(startIndex = 0) {
    recallPayslipsList = allStoredDocuments
      .filter(d => d.docType === 'payslip')
      .sort((a, b) => new Date(a.payDate || a.createdAt) - new Date(b.payDate || b.createdAt));

    if (recallPayslipsList.length === 0) {
      showToast('No payslips available to recall. Please scan or add a payslip first.');
      return;
    }

    currentRecallIndex = Math.max(0, Math.min(startIndex, recallPayslipsList.length - 1));
    renderCurrentPayslipSheet();
    recallModal.classList.remove('hidden');
  }

  function renderCurrentPayslipSheet() {
    const ps = recallPayslipsList[currentRecallIndex];
    if (!ps) return;

    recallStepIndicator.textContent = `Payslip ${currentRecallIndex + 1} of ${recallPayslipsList.length}`;

    btnPrevPayslip.disabled = currentRecallIndex === 0;
    btnNextPayslip.disabled = currentRecallIndex === recallPayslipsList.length - 1;

    const gross = Number(ps.grossPay || 0);
    const tax = Number(ps.taxPaid || 0);
    const ni = Number(ps.nationalInsurance || 0);
    const pension = Number(ps.pension || 0);
    const studentLoan = Number(ps.studentLoan || 0);
    const other = Number(ps.otherDeductions || 0);
    const totalDeductions = tax + ni + pension + studentLoan + other;
    const net = Number(ps.netPay || (gross - totalDeductions));

    const safeEmployer = escapeHTML(ps.employerName || 'EMPLOYER PAY ADVICE');
    const safeEmployee = escapeHTML(ps.employeeName || 'Standard Employee');
    const safeDate = escapeHTML(ps.payDate || 'Date N/A');
    const safeTaxYear = escapeHTML(ps.taxYear || '2025-2026');
    const safeTaxCode = escapeHTML(ps.taxCode || '1257L');
    const safeNino = escapeHTML(ps.nino || 'N/A');
    const safePeriod = escapeHTML(ps.taxWeekMonth || 'Month');

    payslipSheet.innerHTML = `
      <div class="ps-header">
        <div>
          <div class="ps-employer-title">${safeEmployer}</div>
          <div style="font-size:0.85rem; color:var(--text-muted);">Employee: ${safeEmployee}</div>
        </div>
        <div style="text-align:right;">
          <span class="ps-title-badge">OFFICIAL PAYSLIP</span>
          <div style="font-size:0.85rem; font-weight:700; color:var(--gov-blue-dark); margin-top:0.2rem;">${safeDate}</div>
        </div>
      </div>

      <div class="ps-meta-grid">
        <div class="ps-meta-item">
          <label>Tax Year</label>
          <span>${safeTaxYear}</span>
        </div>
        <div class="ps-meta-item">
          <label>Tax Code</label>
          <span>${safeTaxCode}</span>
        </div>
        <div class="ps-meta-item">
          <label>NI Number</label>
          <span>${safeNino}</span>
        </div>
        <div class="ps-meta-item">
          <label>Tax Period</label>
          <span>${safePeriod}</span>
        </div>
      </div>

      <div class="ps-tables-grid">
        <div class="ps-table-col">
          <h4>EARNINGS</h4>
          <div class="ps-row">
            <span>Basic / Gross Pay</span>
            <span>${TaxDB.formatCurrency(gross)}</span>
          </div>
          <div class="ps-row" style="border-top: 1px dashed var(--border-color); font-weight:700; margin-top:0.5rem; padding-top:0.5rem;">
            <span>Total Gross</span>
            <span>${TaxDB.formatCurrency(gross)}</span>
          </div>
        </div>

        <div class="ps-table-col">
          <h4>DEDUCTIONS</h4>
          <div class="ps-row">
            <span>PAYE Income Tax</span>
            <span>${TaxDB.formatCurrency(tax)}</span>
          </div>
          <div class="ps-row">
            <span>National Insurance</span>
            <span>${TaxDB.formatCurrency(ni)}</span>
          </div>
          ${pension > 0 ? `<div class="ps-row"><span>Pension</span><span>${TaxDB.formatCurrency(pension)}</span></div>` : ''}
          ${studentLoan > 0 ? `<div class="ps-row"><span>Student Loan</span><span>${TaxDB.formatCurrency(studentLoan)}</span></div>` : ''}
          ${other > 0 ? `<div class="ps-row"><span>Other Ded.</span><span>${TaxDB.formatCurrency(other)}</span></div>` : ''}
          <div class="ps-row" style="border-top: 1px dashed var(--border-color); font-weight:700; margin-top:0.5rem; padding-top:0.5rem;">
            <span>Total Deductions</span>
            <span>${TaxDB.formatCurrency(totalDeductions)}</span>
          </div>
        </div>
      </div>

      <div class="ps-net-box">
        <span class="ps-net-label">NET PAY (TAKE HOME)</span>
        <span class="ps-net-amount">${TaxDB.formatCurrency(net)}</span>
      </div>
    `;
  }

  function closeRecallViewer() {
    recallModal.classList.add('hidden');
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

    modalBody.innerHTML = '';
    const form = document.createElement('form');
    form.id = 'modalEditForm';

    const fieldsGrid = document.createElement('div');
    fieldsGrid.className = 'form-grid';

    modalBody.appendChild(form);
    form.appendChild(fieldsGrid);

    let html = '';
    if (doc.docType === 'payslip') {
      html = `
        <div class="form-group"><label>Pay Date</label><input type="date" name="payDate" class="form-control" value="${escapeHTML(doc.payDate || '')}"></div>
        <div class="form-group"><label>Employer Name</label><input type="text" name="employerName" class="form-control" value="${escapeHTML(doc.employerName || '')}"></div>
        <div class="form-group"><label>Employee Name</label><input type="text" name="employeeName" class="form-control" value="${escapeHTML(doc.employeeName || '')}"></div>
        <div class="form-group"><label>Gross Pay (£)</label><input type="number" step="0.01" name="grossPay" class="form-control" value="${doc.grossPay || 0}"></div>
        <div class="form-group"><label>Net Pay (£)</label><input type="number" step="0.01" name="netPay" class="form-control" value="${doc.netPay || 0}"></div>
        <div class="form-group"><label>PAYE Tax (£)</label><input type="number" step="0.01" name="taxPaid" class="form-control" value="${doc.taxPaid || 0}"></div>
        <div class="form-group"><label>National Insurance (£)</label><input type="number" step="0.01" name="nationalInsurance" class="form-control" value="${doc.nationalInsurance || 0}"></div>
        <div class="form-group"><label>Pension (£)</label><input type="number" step="0.01" name="pension" class="form-control" value="${doc.pension || 0}"></div>
        <div class="form-group"><label>Student Loan (£)</label><input type="number" step="0.01" name="studentLoan" class="form-control" value="${doc.studentLoan || 0}"></div>
        <div class="form-group"><label>Tax Code</label><input type="text" name="taxCode" class="form-control" value="${escapeHTML(doc.taxCode || '1257L')}"></div>
        <div class="form-group"><label>NINO</label><input type="text" name="nino" class="form-control" value="${escapeHTML(doc.nino || '')}"></div>
      `;
    } else if (doc.docType === 'p60') {
      html = `
        <div class="form-group"><label>Tax Year</label><input type="text" name="taxYear" class="form-control" value="${escapeHTML(doc.taxYear || '')}"></div>
        <div class="form-group"><label>Employer Details</label><input type="text" name="employerName" class="form-control" value="${escapeHTML(doc.employerName || doc.employerDetails || '')}"></div>
        <div class="form-group"><label>Employee Name</label><input type="text" name="employeeName" class="form-control" value="${escapeHTML(doc.employeeName || '')}"></div>
        <div class="form-group"><label>Total Pay (£)</label><input type="number" step="0.01" name="totalPay" class="form-control" value="${doc.totalPay || 0}"></div>
        <div class="form-group"><label>Total Tax (£)</label><input type="number" step="0.01" name="totalTax" class="form-control" value="${doc.totalTax || 0}"></div>
        <div class="form-group"><label>Final Tax Code</label><input type="text" name="finalTaxCode" class="form-control" value="${escapeHTML(doc.finalTaxCode || '')}"></div>
        <div class="form-group"><label>NINO</label><input type="text" name="nino" class="form-control" value="${escapeHTML(doc.nino || '')}"></div>
      `;
    } else if (doc.docType === 'p45') {
      html = `
        <div class="form-group"><label>Leaving Date</label><input type="date" name="leavingDate" class="form-control" value="${escapeHTML(doc.leavingDate || '')}"></div>
        <div class="form-group"><label>Employer Name</label><input type="text" name="employerName" class="form-control" value="${escapeHTML(doc.employerName || '')}"></div>
        <div class="form-group"><label>Employee Name</label><input type="text" name="employeeName" class="form-control" value="${escapeHTML(doc.employeeName || '')}"></div>
        <div class="form-group"><label>Total Pay to Date (£)</label><input type="number" step="0.01" name="totalPayToDate" class="form-control" value="${doc.totalPayToDate || 0}"></div>
        <div class="form-group"><label>Total Tax to Date (£)</label><input type="number" step="0.01" name="totalTaxToDate" class="form-control" value="${doc.totalTaxToDate || 0}"></div>
        <div class="form-group"><label>Tax Code at Leaving</label><input type="text" name="taxCodeAtLeaving" class="form-control" value="${escapeHTML(doc.taxCodeAtLeaving || '')}"></div>
        <div class="form-group"><label>NINO</label><input type="text" name="nino" class="form-control" value="${escapeHTML(doc.nino || '')}"></div>
      `;
    } else if (doc.docType === 'p11d') {
      const itemized = doc.itemizedBenefits || {};
      html = `
        <div class="form-group"><label>Tax Year</label><input type="text" name="taxYear" class="form-control" value="${escapeHTML(doc.taxYear || '')}"></div>
        <div class="form-group"><label>Employer Name</label><input type="text" name="employerName" class="form-control" value="${escapeHTML(doc.employerName || '')}"></div>
        <div class="form-group"><label>Employee Name</label><input type="text" name="employeeName" class="form-control" value="${escapeHTML(doc.employeeName || '')}"></div>
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
