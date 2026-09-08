/**
 * analytics.js - Chart.js Visualizations & Tax Reconciliation Summary
 * UK Tax Document Management PWA
 */

(function (global) {
  'use strict';

  // Holds active Chart instances to allow updating / destroying on re-render
  const activeCharts = {
    timelineChart: null,
    deductionChart: null,
    p60ReconciliationChart: null,
    benefitsChart: null
  };

  /**
   * Helper to destroy an existing chart instance before creating a new one
   */
  function destroyChart(chartKey) {
    if (activeCharts[chartKey]) {
      activeCharts[chartKey].destroy();
      activeCharts[chartKey] = null;
    }
  }

  /**
   * Filter documents by tax year
   * @param {Array} documents
   * @param {string} selectedTaxYear e.g., 'all' or '2025-2026'
   * @returns {Array}
   */
  function filterDocsByTaxYear(documents, selectedTaxYear) {
    if (!selectedTaxYear || selectedTaxYear === 'all') {
      return documents || [];
    }
    return (documents || []).filter(doc => doc.taxYear === selectedTaxYear);
  }

  /**
   * Renders the 4 required interactive charts and tax reconciliation summary
   * @param {Array} documents List of all stored document objects
   * @param {string} selectedTaxYear Tax Year filter (e.g. "2025-2026" or "all")
   */
  function renderAnalytics(documents, selectedTaxYear) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js is not loaded.');
      return;
    }

    const docs = filterDocsByTaxYear(documents, selectedTaxYear);

    renderTimelineChart(docs);
    renderDeductionBreakdownChart(docs);
    renderP60ReconciliationChart(docs);
    renderBenefitsImpactChart(docs);
    renderReconciliationSummaryCard(docs);
  }

  /**
   * 1. Income & Deductions Timeline (Line chart tracking Gross vs. Net Pay and Total Deductions)
   */
  function renderTimelineChart(docs) {
    destroyChart('timelineChart');
    const canvas = document.getElementById('chartTimeline');
    if (!canvas) return;

    // Filter payslips and sort by payDate ascending
    const payslips = docs
      .filter(d => d.docType === 'payslip')
      .sort((a, b) => new Date(a.payDate || a.createdAt) - new Date(b.payDate || b.createdAt));

    const labels = payslips.map(d => {
      if (d.payDate) {
        const date = new Date(d.payDate);
        return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      }
      return d.taxWeekMonth || 'Payslip';
    });

    const grossData = payslips.map(d => Number(d.grossPay || 0));
    const netData = payslips.map(d => Number(d.netPay || 0));
    const deductionsData = payslips.map(d => {
      const gross = Number(d.grossPay || 0);
      const net = Number(d.netPay || 0);
      const calculated = gross - net;
      return calculated > 0 ? calculated : (Number(d.taxPaid || 0) + Number(d.nationalInsurance || 0) + Number(d.pension || 0) + Number(d.studentLoan || 0) + Number(d.otherDeductions || 0));
    });

    activeCharts.timelineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [
          {
            label: 'Gross Pay (£)',
            data: grossData.length > 0 ? grossData : [0],
            borderColor: '#005ea5',
            backgroundColor: 'rgba(0, 94, 165, 0.1)',
            tension: 0.2,
            fill: true
          },
          {
            label: 'Net Pay (£)',
            data: netData.length > 0 ? netData : [0],
            borderColor: '#00703c',
            backgroundColor: 'rgba(0, 112, 60, 0.1)',
            tension: 0.2,
            fill: true
          },
          {
            label: 'Total Deductions (£)',
            data: deductionsData.length > 0 ? deductionsData : [0],
            borderColor: '#d4351c',
            backgroundColor: 'rgba(212, 53, 28, 0.1)',
            tension: 0.2,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => '£' + val
            }
          }
        }
      }
    });
  }

  /**
   * 2. Deduction Breakdown (Stacked bar chart showing PAYE, NI, Pension, and Student Loan splits)
   */
  function renderDeductionBreakdownChart(docs) {
    destroyChart('deductionChart');
    const canvas = document.getElementById('chartDeductions');
    if (!canvas) return;

    const payslips = docs
      .filter(d => d.docType === 'payslip')
      .sort((a, b) => new Date(a.payDate || a.createdAt) - new Date(b.payDate || b.createdAt));

    const labels = payslips.map(d => {
      if (d.payDate) {
        const date = new Date(d.payDate);
        return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      }
      return d.taxWeekMonth || 'Payslip';
    });

    const payeData = payslips.map(d => Number(d.taxPaid || 0));
    const niData = payslips.map(d => Number(d.nationalInsurance || 0));
    const pensionData = payslips.map(d => Number(d.pension || 0));
    const studentLoanData = payslips.map(d => Number(d.studentLoan || 0));
    const otherData = payslips.map(d => Number(d.otherDeductions || 0));

    activeCharts.deductionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [
          {
            label: 'PAYE Tax (£)',
            data: payeData.length > 0 ? payeData : [0],
            backgroundColor: '#d4351c'
          },
          {
            label: 'National Insurance (£)',
            data: niData.length > 0 ? niData : [0],
            backgroundColor: '#f47738'
          },
          {
            label: 'Pension (£)',
            data: pensionData.length > 0 ? pensionData : [0],
            backgroundColor: '#1d70b8'
          },
          {
            label: 'Student Loan (£)',
            data: studentLoanData.length > 0 ? studentLoanData : [0],
            backgroundColor: '#4c2c92'
          },
          {
            label: 'Other Deductions (£)',
            data: otherData.length > 0 ? otherData : [0],
            backgroundColor: '#505a5f'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          x: { stacked: true },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (val) => '£' + val
            }
          }
        }
      }
    });
  }

  /**
   * 3. Annual Tax Summary (Comparing P60 total figures against accumulated monthly payslip totals)
   */
  function renderP60ReconciliationChart(docs) {
    destroyChart('p60ReconciliationChart');
    const canvas = document.getElementById('chartP60Reconciliation');
    if (!canvas) return;

    // Calculate sum from payslips
    const payslips = docs.filter(d => d.docType === 'payslip');
    const accumulatedGross = payslips.reduce((sum, d) => sum + Number(d.grossPay || 0), 0);
    const accumulatedTax = payslips.reduce((sum, d) => sum + Number(d.taxPaid || 0), 0);

    // Get P60 figures (if present)
    const p60Docs = docs.filter(d => d.docType === 'p60');
    const p60TotalPay = p60Docs.reduce((sum, d) => sum + Number(d.totalPay || 0), 0);
    const p60TotalTax = p60Docs.reduce((sum, d) => sum + Number(d.totalTax || 0), 0);

    activeCharts.p60ReconciliationChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Total Pay / Gross', 'Total Tax / PAYE'],
        datasets: [
          {
            label: 'Accumulated Payslips (£)',
            data: [accumulatedGross, accumulatedTax],
            backgroundColor: '#005ea5'
          },
          {
            label: 'P60 Certificate Totals (£)',
            data: [p60TotalPay, p60TotalTax],
            backgroundColor: '#28a745'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => '£' + val
            }
          }
        }
      }
    });
  }

  /**
   * 4. Benefits Impact (Visual breakdown of taxable P11D benefits in kind)
   */
  function renderBenefitsImpactChart(docs) {
    destroyChart('benefitsChart');
    const canvas = document.getElementById('chartBenefits');
    if (!canvas) return;

    const p11dDocs = docs.filter(d => d.docType === 'p11d');

    let companyCar = 0;
    let privateMedical = 0;
    let relocation = 0;
    let fuelAllowance = 0;
    let otherBenefits = 0;

    p11dDocs.forEach(d => {
      if (d.itemizedBenefits) {
        companyCar += Number(d.itemizedBenefits.companyCar || 0);
        privateMedical += Number(d.itemizedBenefits.privateMedical || 0);
        relocation += Number(d.itemizedBenefits.relocation || 0);
        fuelAllowance += Number(d.itemizedBenefits.fuelAllowance || 0);
      } else if (d.totalBenefits) {
        otherBenefits += Number(d.totalBenefits || 0);
      }
    });

    const totalCalculated = companyCar + privateMedical + relocation + fuelAllowance + otherBenefits;

    activeCharts.benefitsChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Company Car', 'Private Medical', 'Relocation', 'Fuel Allowance', 'Other Benefits'],
        datasets: [{
          data: totalCalculated > 0
            ? [companyCar, privateMedical, relocation, fuelAllowance, otherBenefits]
            : [0, 0, 0, 0, 0],
          backgroundColor: [
            '#005ea5',
            '#00703c',
            '#f47738',
            '#4c2c92',
            '#505a5f'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: £${ctx.parsed.toFixed(2)}`
            }
          }
        }
      }
    });
  }

  /**
   * Render reconciliation numerical callout cards
   */
  function renderReconciliationSummaryCard(docs) {
    const summaryElem = document.getElementById('reconciliationSummary');
    if (!summaryElem) return;

    const payslips = docs.filter(d => d.docType === 'payslip');
    const p60Docs = docs.filter(d => d.docType === 'p60');
    const p11dDocs = docs.filter(d => d.docType === 'p11d');

    const totalPayslipGross = payslips.reduce((s, d) => s + Number(d.grossPay || 0), 0);
    const totalPayslipTax = payslips.reduce((s, d) => s + Number(d.taxPaid || 0), 0);
    const totalPayslipNI = payslips.reduce((s, d) => s + Number(d.nationalInsurance || 0), 0);
    const totalPayslipNet = payslips.reduce((s, d) => s + Number(d.netPay || 0), 0);

    const totalP60Pay = p60Docs.reduce((s, d) => s + Number(d.totalPay || 0), 0);
    const totalP60Tax = p60Docs.reduce((s, d) => s + Number(d.totalTax || 0), 0);

    const totalP11DBenefits = p11dDocs.reduce((s, d) => s + Number(d.totalBenefits || 0), 0);

    const payDiff = totalP60Pay > 0 ? (totalP60Pay - totalPayslipGross) : 0;
    const taxDiff = totalP60Tax > 0 ? (totalP60Tax - totalPayslipTax) : 0;

    summaryElem.innerHTML = `
      <div class="summary-cards-grid">
        <div class="summary-card">
          <span class="card-label">Total Gross (Payslips)</span>
          <span class="card-value">${TaxDB.formatCurrency(totalPayslipGross)}</span>
          <span class="card-subtext">${payslips.length} payslip(s) scanned</span>
        </div>
        <div class="summary-card">
          <span class="card-label">Total PAYE Tax Paid</span>
          <span class="card-value">${TaxDB.formatCurrency(totalPayslipTax)}</span>
          <span class="card-subtext">NI: ${TaxDB.formatCurrency(totalPayslipNI)}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">Total Net Income</span>
          <span class="card-value net-highlight">${TaxDB.formatCurrency(totalPayslipNet)}</span>
          <span class="card-subtext">Take home pay</span>
        </div>
        <div class="summary-card">
          <span class="card-label">P60 Declared Pay</span>
          <span class="card-value">${totalP60Pay > 0 ? TaxDB.formatCurrency(totalP60Pay) : 'N/A'}</span>
          <span class="card-subtext">${totalP60Pay > 0 ? `Diff vs payslips: ${TaxDB.formatCurrency(payDiff)}` : 'No P60 uploaded'}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">P11D Benefits in Kind</span>
          <span class="card-value">${totalP11DBenefits > 0 ? TaxDB.formatCurrency(totalP11DBenefits) : '£0.00'}</span>
          <span class="card-subtext">Taxable benefits value</span>
        </div>
      </div>
    `;
  }

  // Export
  global.TaxAnalytics = {
    renderAnalytics,
    filterDocsByTaxYear
  };

})(typeof window !== 'undefined' ? window : globalThis);
