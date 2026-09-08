/**
 * ocr.js - Client-side OCR Processing & UK Tax Document Parser
 * UK Tax Document Management PWA
 */

(function (global) {
  'use strict';

  // Key UK tax markers for auto-detecting document types
  const MARKERS = {
    P60: [
      /\bp60\b/i,
      /end of year certificate/i,
      /total pay in this year/i,
      /total tax in this year/i,
      /tax year \d{4}/i,
      /in this employment/i
    ],
    P45: [
      /\bp45\b/i,
      /details of employee leaving/i,
      /total pay to date/i,
      /total tax to date/i,
      /date of leaving/i,
      /leaving date/i,
      /student loan deductions? to continue/i
    ],
    P11D: [
      /\bp11d\b/i,
      /expenses and benefits/i,
      /benefits in kind/i,
      /company car/i,
      /private medical/i,
      /relocation expenses/i,
      /fuel allowance/i,
      /cash equivalent/i
    ],
    PAYSLIP: [
      /payslip/i,
      /pay advice/i,
      /gross pay/i,
      /net pay/i,
      /paye/i,
      /national insurance/i,
      /\bni\b/i,
      /tax code/i,
      /pay date/i,
      /tax week/i,
      /tax month/i
    ]
  };

  /**
   * Auto-detects the UK tax document type based on extracted text content.
   * @param {string} text
   * @returns {'payslip'|'p60'|'p45'|'p11d'}
   */
  function autoDetectType(text) {
    if (!text || typeof text !== 'string') return 'payslip';

    let p60Score = 0;
    let p45Score = 0;
    let p11dScore = 0;
    let payslipScore = 0;

    MARKERS.P60.forEach(re => { if (re.test(text)) p60Score += 2; });
    MARKERS.P45.forEach(re => { if (re.test(text)) p45Score += 2; });
    MARKERS.P11D.forEach(re => { if (re.test(text)) p11dScore += 2; });
    MARKERS.PAYSLIP.forEach(re => { if (re.test(text)) payslipScore += 1; });

    if (/\bp60\b/i.test(text) || /end of year certificate/i.test(text)) p60Score += 5;
    if (/\bp45\b/i.test(text) || /details of employee leaving/i.test(text)) p45Score += 5;
    if (/\bp11d\b/i.test(text) || /expenses and benefits/i.test(text)) p11dScore += 5;

    const scores = [
      { type: 'p60', score: p60Score },
      { type: 'p45', score: p45Score },
      { type: 'p11d', score: p11dScore },
      { type: 'payslip', score: payslipScore }
    ];

    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score > 0) {
      return scores[0].type;
    }

    return 'payslip'; // Default fallback
  }

  /**
   * Utility regex matcher for monetary amounts
   */
  function extractAmount(text, keywords) {
    if (!text) return null;
    const lines = text.split('\n');

    for (const keyword of keywords) {
      for (const line of lines) {
        if (keyword.test(line)) {
          const match = line.match(/(?:£\s*)?([0-9]{1,3}(?:,[0-9]{3})*|\d+)\.([0-9]{2})\b/);
          if (match) {
            const rawVal = match[1].replace(/,/g, '') + '.' + match[2];
            const num = parseFloat(rawVal);
            if (!isNaN(num)) return num;
          }
        }
      }
    }
    return null;
  }

  /**
   * Utility matcher for dates
   */
  function extractDate(text, keywords) {
    if (!text) return null;
    const lines = text.split('\n');

    const dateRegexes = [
      /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](20\d{2})\b/, // DD/MM/YYYY
      /\b(20\d{2})[\/\.-](\d{1,2})[\/\.-](\d{1,2})\b/, // YYYY-MM-DD
      /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/i // 25 May 2025
    ];

    for (const keyword of keywords) {
      for (const line of lines) {
        if (keyword.test(line)) {
          for (const regex of dateRegexes) {
            const match = line.match(regex);
            if (match) {
              return normalizeDateString(match[0]);
            }
          }
        }
      }
    }

    for (const line of lines) {
      for (const regex of dateRegexes) {
        const match = line.match(regex);
        if (match) {
          return normalizeDateString(match[0]);
        }
      }
    }

    return null;
  }

  function normalizeDateString(dateStr) {
    try {
      const parts = dateStr.split(/[\/\.-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      // ignore
    }
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Extract UK National Insurance Number (NINO)
   * e.g. QQ123456A or QQ 12 34 56 A
   */
  function extractNINO(text) {
    if (!text) return '';

    // Check lines with NI / NINO explicit label first
    const lines = text.split('\n');
    for (const line of lines) {
      if (/(?:ni|nino|national insurance)/i.test(line)) {
        const match = line.match(/\b([A-Z]{2})\s*(\d{2})\s*(\d{2})\s*(\d{2})\s*([A-D])\b/i);
        if (match) {
          return `${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}`.toUpperCase();
        }
      }
    }

    const re = /\b([A-Z]{2})\s*(\d{2})\s*(\d{2})\s*(\d{2})\s*([A-D])\b/i;
    const match = text.match(re);
    if (match) {
      return `${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}`.toUpperCase();
    }
    return '';
  }

  /**
   * Extract UK Tax Code
   * e.g. 1257L, BR, D0, D1, NT, K100, 1257L W1/M1, S1257L
   */
  function extractTaxCode(text) {
    if (!text) return '1257L';

    const lines = text.split('\n');
    // Look specifically for lines containing 'Tax Code' or 'Code'
    for (const line of lines) {
      if (/(?:tax code|code)/i.test(line)) {
        const match = line.match(/(?:tax code|code)[\s:]*([S|C]?(?:K\d{1,4}|\d{1,4}[LMNTYK]|BR|D0|D1|NT|0T)(?:\s*(?:W1|M1|X))?)/i);
        if (match) {
          return match[1].toUpperCase().trim();
        }
      }
    }

    const generalRe = /\b([S|C]?(?:K\d{1,4}|\d{1,4}[LMNTYK]|BR|D0|D1|NT|0T)(?:\s*(?:W1|M1|X))?)\b/i;
    const match = text.match(generalRe);
    if (match) {
      return match[1].toUpperCase().trim();
    }

    return '1257L';
  }

  /**
   * Extract Tax Year from text (e.g. 2025-2026, 2025/26, 2025-26)
   */
  function extractTaxYear(text) {
    if (!text) return null;
    const re = /\b(20\d{2})[\/-](20\d{2}|\d{2})\b/;
    const match = text.match(re);
    if (match) {
      let start = parseInt(match[1], 10);
      let end = parseInt(match[2], 10);
      if (end < 100) end += 2000;
      return `${start}-${end}`;
    }
    return null;
  }

  /**
   * Parsers for Payslip fields
   */
  function parsePayslip(text) {
    const gross = extractAmount(text, [/gross/i, /gross pay/i, /total gross/i, /basic pay/i]) || 0;
    const net = extractAmount(text, [/net/i, /net pay/i, /take home/i, /total net/i]) || 0;
    const tax = extractAmount(text, [/paye/i, /income tax/i, /tax paid/i, /tax deducted/i, /tax\b/i]) || 0;
    const ni = extractAmount(text, [/national insurance/i, /\bni\b/i, /ni contribution/i, /ee ni/i]) || 0;
    const pension = extractAmount(text, [/pension/i, /ee pension/i, /pension contr/i]) || 0;
    const studentLoan = extractAmount(text, [/student loan/i, /\bsl\b/i]) || 0;
    const otherDeductions = extractAmount(text, [/other ded/i, /other deductions/i, /voluntary ded/i]) || 0;

    const payDate = extractDate(text, [/pay date/i, /date/i, /process date/i, /payment date/i]) || new Date().toISOString().split('T')[0];

    // Tax Week or Month
    let taxWeekMonth = '';
    const twMatch = text.match(/tax\s*(week|month|period)[\s:]*(\d{1,2})/i);
    if (twMatch) {
      taxWeekMonth = `${twMatch[1].toLowerCase()} ${twMatch[2]}`;
    }

    // Employer Name & Employee Name
    let employerName = '';
    const empMatch = text.match(/(?:employer|company|organisation)[\s:]+([A-Za-z0-9\s&.,'-]+)/i);
    if (empMatch) {
      employerName = empMatch[1].trim().split('\n')[0];
    } else {
      // Fallback: search for top non-keyword line
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && !/payslip|employee|pay date|gross|net|tax/i.test(lines[0])) {
        employerName = lines[0].replace(/[-_]/g, ' ').trim();
      }
    }

    let employeeName = '';
    const eeMatch = text.match(/(?:employee|name|employee name)[\s:]+([A-Za-z\s.'-]+)/i);
    if (eeMatch) {
      employeeName = eeMatch[1].trim().split('\n')[0];
    }

    const nino = extractNINO(text);
    const taxCode = extractTaxCode(text);

    return {
      docType: 'payslip',
      grossPay: gross,
      netPay: net,
      taxPaid: tax,
      nationalInsurance: ni,
      pension: pension,
      studentLoan: studentLoan,
      otherDeductions: otherDeductions,
      payDate: payDate,
      taxWeekMonth: taxWeekMonth,
      employerName: employerName,
      employeeName: employeeName,
      nino: nino,
      taxCode: taxCode,
      rawText: text
    };
  }

  /**
   * Parsers for P60 fields
   */
  function parseP60(text) {
    const taxYear = extractTaxYear(text) || (global.TaxDB ? global.TaxDB.getTaxYear(new Date()) : '2025-2026');
    const totalPay = extractAmount(text, [/total pay in this year/i, /in this employment pay/i, /total pay/i, /pay in year/i]) || 0;
    const totalTax = extractAmount(text, [/total tax in this year/i, /total income tax/i, /tax paid in year/i, /total tax/i]) || 0;
    const finalTaxCode = extractTaxCode(text);
    const nino = extractNINO(text);

    let employerDetails = '';
    const empMatch = text.match(/(?:employer|employer details|employer name)[\s:]+([A-Za-z0-9\s&.,'-]+)/i);
    if (empMatch) {
      employerDetails = empMatch[1].trim().split('\n')[0];
    }

    return {
      docType: 'p60',
      taxYear: taxYear,
      totalPay: totalPay,
      totalTax: totalTax,
      finalTaxCode: finalTaxCode,
      nino: nino,
      employerDetails: employerDetails,
      rawText: text
    };
  }

  /**
   * Parsers for P45 fields
   */
  function parseP45(text) {
    const totalPayToDate = extractAmount(text, [/total pay to date/i, /pay to date/i, /total pay/i]) || 0;
    const totalTaxToDate = extractAmount(text, [/total tax to date/i, /tax to date/i, /total tax/i]) || 0;
    const leavingDate = extractDate(text, [/date of leaving/i, /leaving date/i, /date left/i]) || new Date().toISOString().split('T')[0];

    const hasStudentLoan = /student loan deductions? to continue/i.test(text) || /student loan/i.test(text);
    const taxCode = extractTaxCode(text);
    const nino = extractNINO(text);

    return {
      docType: 'p45',
      totalPayToDate: totalPayToDate,
      totalTaxToDate: totalTaxToDate,
      leavingDate: leavingDate,
      studentLoanDeduction: hasStudentLoan,
      taxCodeAtLeaving: taxCode,
      nino: nino,
      rawText: text
    };
  }

  /**
   * Parsers for P11D fields
   */
  function parseP11D(text) {
    const taxYear = extractTaxYear(text) || (global.TaxDB ? global.TaxDB.getTaxYear(new Date()) : '2025-2026');

    const companyCar = extractAmount(text, [/company car/i, /car benefit/i, /car provided/i]) || 0;
    const privateMedical = extractAmount(text, [/private medical/i, /medical insurance/i, /healthcare/i]) || 0;
    const relocation = extractAmount(text, [/relocation/i, /relocation expenses/i]) || 0;
    const fuelAllowance = extractAmount(text, [/fuel allowance/i, /car fuel/i, /fuel benefit/i]) || 0;

    let totalBenefits = extractAmount(text, [/total benefits/i, /total value/i, /cash equivalent/i]);
    if (!totalBenefits) {
      totalBenefits = companyCar + privateMedical + relocation + fuelAllowance;
    }

    return {
      docType: 'p11d',
      taxYear: taxYear,
      totalBenefits: totalBenefits,
      itemizedBenefits: {
        companyCar: companyCar,
        privateMedical: privateMedical,
        relocation: relocation,
        fuelAllowance: fuelAllowance
      },
      rawText: text
    };
  }

  /**
   * Parses text according to docType
   */
  function parseDocument(text, docType) {
    const detectedType = docType || autoDetectType(text);

    switch (detectedType) {
      case 'p60':
        return parseP60(text);
      case 'p45':
        return parseP45(text);
      case 'p11d':
        return parseP11D(text);
      case 'payslip':
      default:
        return parsePayslip(text);
    }
  }

  /**
   * Performs OCR on an image File, Blob, or URL using Tesseract.js
   * @param {File|Blob|string} imageSource
   * @param {function} onProgress
   * @returns {Promise<Object>} extracted text & parsed fields
   */
  async function processImage(imageSource, onProgress) {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js is not loaded.');
    }

    if (onProgress) onProgress({ status: 'initializing', progress: 0.1 });

    const worker = await Tesseract.createWorker('eng', 1, {
      workerPath: './vendor/worker.min.js',
      corePath: './vendor/tesseract-core-simd.wasm.js',
      logger: m => {
        if (onProgress && m.status) {
          onProgress(m);
        }
      }
    });

    if (onProgress) onProgress({ status: 'recognizing text', progress: 0.3 });

    const ret = await worker.recognize(imageSource);
    const text = ret.data.text;

    await worker.terminate();

    if (onProgress) onProgress({ status: 'parsing document', progress: 1.0 });

    const docType = autoDetectType(text);
    const parsedData = parseDocument(text, docType);

    return {
      rawText: text,
      autoDetectedType: docType,
      parsedData: parsedData
    };
  }

  // Export to global object
  global.TaxOCR = {
    autoDetectType,
    parseDocument,
    parsePayslip,
    parseP60,
    parseP45,
    parseP11D,
    processImage,
    extractAmount,
    extractDate,
    extractNINO,
    extractTaxCode
  };

})(typeof window !== 'undefined' ? window : globalThis);
