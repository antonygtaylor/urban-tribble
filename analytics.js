/**
 * analytics.js - Chart.js Visualizations & UK Wage/Inflation Benchmarking Insights Engine
 * UK Tax Document Management PWA
 */

(function (global) {
  'use strict';

  // Active Chart.js instances
  const activeCharts = {
    timelineChart: null,
    deductionChart: null,
    p60ReconciliationChart: null,
    benefitsChart: null,
    wageBenchmarkChart: null
  };

  /**
   * Official UK Benchmark Reference Datasets (2020 to 2026)
   * Annual equivalent based on 37.5 hrs/wk (1,950 hrs/yr)
   */
  const UK_BENCHMARKS = {
    '2020-2021': { nmw: 17004, realLivingWage: 18525, ukMedianWage: 31461, cpiRate: 0.8 },
    '2021-2022': { nmw: 17374, realLivingWage: 19305, ukMedianWage: 31285, cpiRate: 2.5 },
    '2022-2023': { nmw: 18525, realLivingWage: 21255, ukMedianWage: 33000, cpiRate: 9.1 },
    '2023-2024': { nmw: 20319, realLivingWage: 23400, ukMedianWage: 34963, cpiRate: 7.3 },
    '2024-2025': { nmw: 22308, realLivingWage: 24570, ukMedianWage: 37430, cpiRate: 3.2 },
    '2025-2026': { nmw: 23809, realLivingWage: 27007, ukMedianWage: 39100, cpiRate: 2.5 }
  };

  function destroyChart(chartKey) {
    if (activeCharts[chartKey]) {
      activeCharts[chartKey].destroy();
      activeCharts[chartKey] = null;
    }
  }

  function filterDocsByTaxYear(documents, selectedTaxYear, excludeDuplicates = true) {
    let docs = documents || [];
    if (excludeDuplicates) {
      docs = docs.filter(d => !d.isDuplicate);
    }
    if (!selectedTaxYear || selectedTaxYear === 'all') {
      return docs;
    }
    return docs.filter(doc => doc.taxYear === selectedTaxYear);
  }

  /**
   * Main render function
   */
  function renderAnalytics(documents, selectedTaxYear) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js is not loaded.');
      return;
    }

    const docs = filterDocsByTaxYear(documents, selectedTaxYear, true);

    renderTimelineChart(docs);
    renderDeductionBreakdownChart(docs);
    renderP60ReconciliationChart(docs);
    renderBenefitsImpactChart(docs);
    renderWageBenchmarkChart(documents); // Uses all documents to plot year-over-year progression
    renderReconciliationSummaryCard(docs);
    renderWageInsightsCard(documents);
  }

  /* 1. Timeline Chart */
  function renderTimelineChart(docs) {
    destroyChart('timelineChart');
    const canvas = document.getElementById('chartTimeline');
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
          y: { beginAtZero: true, ticks: { callback: (val) => '£' + val } }
        }
      }
    });
  }

  /* 2. Deduction Breakdown Chart */
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
          { label: 'PAYE Tax (£)', data: payeData.length > 0 ? payeData : [0], backgroundColor: '#d4351c' },
          { label: 'National Insurance (£)', data: niData.length > 0 ? niData : [0], backgroundColor: '#f47738' },
          { label: 'Pension (£)', data: pensionData.length > 0 ? pensionData : [0], backgroundColor: '#1d70b8' },
          { label: 'Student Loan (£)', data: studentLoanData.length > 0 ? studentLoanData : [0], backgroundColor: '#4c2c92' },
          { label: 'Other Deductions (£)', data: otherData.length > 0 ? otherData : [0], backgroundColor: '#505a5f' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { callback: (val) => '£' + val } }
        }
      }
    });
  }

  /* 3. P60 Reconciliation Chart */
  function renderP60ReconciliationChart(docs) {
    destroyChart('p60ReconciliationChart');
    const canvas = document.getElementById('chartP60Reconciliation');
    if (!canvas) return;

    const payslips = docs.filter(d => d.docType === 'payslip');
    const accumulatedGross = payslips.reduce((sum, d) => sum + Number(d.grossPay || 0), 0);
    const accumulatedTax = payslips.reduce((sum, d) => sum + Number(d.taxPaid || 0), 0);

    const p60Docs = docs.filter(d => d.docType === 'p60');
    const p60TotalPay = p60Docs.reduce((sum, d) => sum + Number(d.totalPay || 0), 0);
    const p60TotalTax = p60Docs.reduce((sum, d) => sum + Number(d.totalTax || 0), 0);

    activeCharts.p60ReconciliationChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Total Pay / Gross', 'Total Tax / PAYE'],
        datasets: [
          { label: 'Accumulated Payslips (£)', data: [accumulatedGross, accumulatedTax], backgroundColor: '#005ea5' },
          { label: 'P60 Certificate Totals (£)', data: [p60TotalPay, p60TotalTax], backgroundColor: '#28a745' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: { y: { beginAtZero: true, ticks: { callback: (val) => '£' + val } } }
      }
    });
  }

  /* 4. Benefits Impact Chart */
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
          data: totalCalculated > 0 ? [companyCar, privateMedical, relocation, fuelAllowance, otherBenefits] : [0, 0, 0, 0, 0],
          backgroundColor: ['#005ea5', '#00703c', '#f47738', '#4c2c92', '#505a5f']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: £${ctx.parsed.toFixed(2)}` } }
        }
      }
    });
  }

  /* 5. Income Progression vs UK Wage & Inflation Benchmarks Chart */
  function renderWageBenchmarkChart(allDocuments) {
    destroyChart('wageBenchmarkChart');
    const canvas = document.getElementById('chartWageBenchmark');
    if (!canvas) return;

    const validDocs = (allDocuments || []).filter(d => !d.isDuplicate);

    // Group earnings by Tax Year
    const taxYearsList = Object.keys(UK_BENCHMARKS);
    const userAnnualEarnings = {};

    taxYearsList.forEach(ty => { userAnnualEarnings[ty] = 0; });

    validDocs.forEach(doc => {
      const ty = doc.taxYear || '2025-2026';
      if (doc.docType === 'p60' && doc.totalPay > 0) {
        userAnnualEarnings[ty] = Math.max(userAnnualEarnings[ty], Number(doc.totalPay));
      } else if (doc.docType === 'payslip') {
        userAnnualEarnings[ty] += Number(doc.grossPay || 0);
      }
    });

    const userData = taxYearsList.map(ty => userAnnualEarnings[ty] || 0);
    const nmwData = taxYearsList.map(ty => UK_BENCHMARKS[ty].nmw);
    const rlwData = taxYearsList.map(ty => UK_BENCHMARKS[ty].realLivingWage);
    const medianData = taxYearsList.map(ty => UK_BENCHMARKS[ty].ukMedianWage);

    activeCharts.wageBenchmarkChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: taxYearsList,
        datasets: [
          {
            label: 'Your Annual Gross (£)',
            data: userData,
            borderColor: '#00703c',
            backgroundColor: 'rgba(0, 112, 60, 0.15)',
            borderWidth: 3,
            tension: 0.2,
            fill: true
          },
          {
            label: 'UK Median Wage (£37,430)',
            data: medianData,
            borderColor: '#005ea5',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false
          },
          {
            label: 'Real Living Wage (£27,007)',
            data: rlwData,
            borderColor: '#f47738',
            borderDash: [3, 3],
            borderWidth: 2,
            fill: false
          },
          {
            label: 'National Minimum Wage (£23,809)',
            data: nmwData,
            borderColor: '#d4351c',
            borderDash: [2, 2],
            borderWidth: 2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.y.toLocaleString('en-GB')}` } }
        },
        scales: {
          y: { beginAtZero: false, ticks: { callback: (val) => '£' + val } }
        }
      }
    });
  }

  /* Summary Card */
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

    const totalP11DBenefits = p11dDocs.reduce((s, d) => s + Number(d.totalBenefits || 0), 0);
    const payDiff = totalP60Pay > 0 ? (totalP60Pay - totalPayslipGross) : 0;

    summaryElem.innerHTML = `
      <div class="summary-cards-grid">
        <div class="summary-card">
          <span class="card-label">Total Gross (Payslips)</span>
          <span class="card-value">${TaxDB.formatCurrency(totalPayslipGross)}</span>
          <span class="card-subtext">${payslips.length} payslip(s) (duplicates excluded)</span>
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

  /* Practical UK Wage & Inflation Benchmarking Insights Card */
  function renderWageInsightsCard(allDocuments) {
    const card = document.getElementById('wageInsightsCard');
    if (!card) return;

    const validDocs = (allDocuments || []).filter(d => !d.isDuplicate);
    if (validDocs.length === 0) {
      card.innerHTML = `
        <p class="subtitle">Upload or scan payslips and P60s to unlock personalized UK wage benchmarking and inflation stats.</p>
      `;
      return;
    }

    // Determine latest tax year user earnings
    const currentTY = '2024-2025';
    const benchmark = UK_BENCHMARKS[currentTY] || UK_BENCHMARKS['2025-2026'];

    // Calculate user annualized gross
    let userGross = 0;
    const payslips = validDocs.filter(d => d.docType === 'payslip');
    const p60s = validDocs.filter(d => d.docType === 'p60');

    if (p60s.length > 0) {
      userGross = Math.max(...p60s.map(p => Number(p.totalPay || 0)));
    } else if (payslips.length > 0) {
      const avgGross = payslips.reduce((s, p) => s + Number(p.grossPay || 0), 0) / payslips.length;
      userGross = avgGross * 12; // Annualized
    }

    const diffVsMedian = userGross - benchmark.ukMedianWage;
    const pctVsMedian = Math.round((diffVsMedian / benchmark.ukMedianWage) * 100);

    const diffVsLiving = userGross - benchmark.realLivingWage;
    const diffVsMinimum = userGross - benchmark.nmw;

    const hourlyEquiv = (userGross / 1950).toFixed(2); // 37.5 hrs/wk standard

    let medianText = '';
    if (pctVsMedian >= 0) {
      medianText = `<span class="stat-highlight-green">+${pctVsMedian}% ABOVE</span> the UK Median Average Wage (${TaxDB.formatCurrency(benchmark.ukMedianWage)}).`;
    } else {
      medianText = `<span class="stat-highlight-orange">${Math.abs(pctVsMedian)}% BELOW</span> the UK Median Average Wage (${TaxDB.formatCurrency(benchmark.ukMedianWage)}).`;
    }

    let livingText = '';
    if (diffVsLiving >= 0) {
      livingText = `Outpacing the Real Living Wage (${TaxDB.formatCurrency(benchmark.realLivingWage)}) by <strong style="color:var(--gov-green);">${TaxDB.formatCurrency(diffVsLiving)}/yr</strong>.`;
    } else {
      livingText = `Trailing the Real Living Wage target by ${TaxDB.formatCurrency(Math.abs(diffVsLiving))}/yr.`;
    }

    card.innerHTML = `
      <div class="insights-grid">
        <div class="insight-box">
          <span class="insight-title">VS. UK AVERAGE MEDIAN WAGE</span>
          <div class="insight-value">${TaxDB.formatCurrency(userGross)} /yr</div>
          <p class="insight-desc">Your annualized wage is ${medianText}</p>
        </div>
        <div class="insight-box">
          <span class="insight-title">REAL LIVING WAGE & NMW BUFFER</span>
          <div class="insight-value">~£${hourlyEquiv} /hr</div>
          <p class="insight-desc">${livingText} (${TaxDB.formatCurrency(diffVsMinimum)} buffer over National Minimum Wage).</p>
        </div>
        <div class="insight-box">
          <span class="insight-title">INFLATION & PURCHASING POWER</span>
          <div class="insight-value">CPI Inflation: ~${benchmark.cpiRate}%</div>
          <p class="insight-desc">UK CPI inflation rate for benchmark reference. Pay increases above this rate represent real income growth.</p>
        </div>
      </div>
    `;
  }

  // Export
  global.TaxAnalytics = {
    renderAnalytics,
    filterDocsByTaxYear,
    UK_BENCHMARKS
  };

})(typeof window !== 'undefined' ? window : globalThis);
