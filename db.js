/**
 * db.js - IndexedDB storage, UK Tax Year utility & Web Crypto AES-256-GCM Encryption Engine
 * UK Tax Document Management PWA
 */

(function (global) {
  'use strict';

  const DB_NAME = 'UKTaxDocsDB';
  const DB_VERSION = 2; // Incremented for encryption support
  const STORE_NAME = 'documents';
  const KEY_STORE_NAME = 'keys';

  let cryptoKeyInstance = null;

  /**
   * Converts ArrayBuffer to Base64 string
   */
  function bufferToBase64(buf) {
    const bin = String.fromCharCode.apply(null, new Uint8Array(buf));
    return global.btoa(bin);
  }

  /**
   * Converts Base64 string to Uint8Array
   */
  function base64ToBuffer(b64) {
    const bin = global.atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Gets or generates the client-side AES-256-GCM encryption key
   * @returns {Promise<CryptoKey>}
   */
  async function getOrCreateCryptoKey() {
    if (cryptoKeyInstance) return cryptoKeyInstance;

    const db = await initDB();

    // Check if key already exists in key store
    const existingKeyRaw = await new Promise((resolve) => {
      const tx = db.transaction(KEY_STORE_NAME, 'readonly');
      const store = tx.objectStore(KEY_STORE_NAME);
      const req = store.get('master_aes_key');
      req.onsuccess = () => resolve(req.result ? req.result.rawKey : null);
      req.onerror = () => resolve(null);
    });

    if (existingKeyRaw) {
      cryptoKeyInstance = await global.crypto.subtle.importKey(
        'raw',
        existingKeyRaw,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      return cryptoKeyInstance;
    }

    // Generate new AES-GCM 256-bit key
    cryptoKeyInstance = await global.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const exportedRaw = await global.crypto.subtle.exportKey('raw', cryptoKeyInstance);

    // Save master key to IDB key store
    await new Promise((resolve, reject) => {
      const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
      const store = tx.objectStore(KEY_STORE_NAME);
      const req = store.put({ id: 'master_aes_key', rawKey: exportedRaw, createdAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });

    return cryptoKeyInstance;
  }

  /**
   * Encrypts sensitive record payload using AES-256-GCM
   * @param {Object} doc
   * @returns {Promise<Object>} Encrypted storage record
   */
  async function encryptRecord(doc) {
    const key = await getOrCreateCryptoKey();
    const iv = global.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

    const sensitiveData = {
      grossPay: doc.grossPay,
      netPay: doc.netPay,
      taxPaid: doc.taxPaid,
      nationalInsurance: doc.nationalInsurance,
      pension: doc.pension,
      studentLoan: doc.studentLoan,
      otherDeductions: doc.otherDeductions,
      totalPay: doc.totalPay,
      totalTax: doc.totalTax,
      totalPayToDate: doc.totalPayToDate,
      totalTaxToDate: doc.totalTaxToDate,
      totalBenefits: doc.totalBenefits,
      itemizedBenefits: doc.itemizedBenefits,
      employerName: doc.employerName,
      employerDetails: doc.employerDetails,
      employeeName: doc.employeeName,
      nino: doc.nino,
      taxCode: doc.taxCode,
      finalTaxCode: doc.finalTaxCode,
      taxCodeAtLeaving: doc.taxCodeAtLeaving,
      rawText: doc.rawText
    };

    const jsonStr = JSON.stringify(sensitiveData);
    const encoded = new TextEncoder().encode(jsonStr);

    const encryptedBuffer = await global.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoded
    );

    return {
      id: doc.id,
      docType: doc.docType,
      taxYear: doc.taxYear,
      payDate: doc.payDate || doc.leavingDate || '',
      leavingDate: doc.leavingDate || '',
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
      isDuplicate: !!doc.isDuplicate,
      isEncrypted: true,
      iv: bufferToBase64(iv),
      cipherText: bufferToBase64(encryptedBuffer)
    };
  }

  /**
   * Decrypts an encrypted storage record using AES-256-GCM
   * @param {Object} record
   * @returns {Promise<Object>} Plain document object
   */
  async function decryptRecord(record) {
    if (!record || !record.isEncrypted || !record.cipherText) {
      return record; // Return as-is if unencrypted legacy
    }

    try {
      const key = await getOrCreateCryptoKey();
      const iv = base64ToBuffer(record.iv);
      const cipherBuffer = base64ToBuffer(record.cipherText);

      const decryptedBuffer = await global.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        cipherBuffer
      );

      const jsonStr = new TextDecoder().decode(decryptedBuffer);
      const sensitiveData = JSON.parse(jsonStr);

      return Object.assign({}, record, sensitiveData);
    } catch (err) {
      console.error('Decryption failed for record:', record.id, err);
      return record;
    }
  }

  /**
   * Calculates the UK Tax Year for a given date.
   */
  function getTaxYear(inputDate) {
    if (!inputDate) {
      const now = new Date();
      return getTaxYear(now);
    }

    if (typeof inputDate === 'string') {
      const tyMatch = inputDate.match(/^(20\d{2})[-/](20\d{2}|\d{2})$/);
      if (tyMatch) {
        let startYr = parseInt(tyMatch[1], 10);
        let endYr = parseInt(tyMatch[2], 10);
        if (endYr < 100) endYr += 2000;
        return `${startYr}-${endYr}`;
      }
    }

    const date = new Date(inputDate);
    if (isNaN(date.getTime())) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (month < 4 || (month === 4 && day < 6)) {
      return `${year - 1}-${year}`;
    } else {
      return `${year}-${year + 1}`;
    }
  }

  function getTaxMonthNum(inputDate) {
    const date = new Date(inputDate);
    if (isNaN(date.getTime())) return 1;

    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (month === 4) {
      return day >= 6 ? 1 : 12;
    } else if (month > 4) {
      return day >= 6 ? month - 3 : month - 4;
    } else {
      return day >= 6 ? month + 9 : month + 8;
    }
  }

  function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(num);
  }

  function getDocSignature(doc) {
    if (!doc) return '';
    const type = (doc.docType || 'payslip').toLowerCase();
    const emp = (doc.employerName || doc.employerDetails || '').toLowerCase().trim();

    if (type === 'payslip') {
      const payDate = doc.payDate || '';
      const gross = Number(doc.grossPay || 0).toFixed(2);
      return `payslip_${payDate}_${gross}_${emp}`;
    } else if (type === 'p60') {
      const ty = doc.taxYear || '';
      const totalPay = Number(doc.totalPay || 0).toFixed(2);
      return `p60_${ty}_${totalPay}_${emp}`;
    } else if (type === 'p45') {
      const leaveDate = doc.leavingDate || '';
      const payToDate = Number(doc.totalPayToDate || 0).toFixed(2);
      return `p45_${leaveDate}_${payToDate}_${emp}`;
    } else if (type === 'p11d') {
      const ty = doc.taxYear || '';
      const benefits = Number(doc.totalBenefits || 0).toFixed(2);
      return `p11d_${ty}_${benefits}_${emp}`;
    }
    return `doc_${type}_${emp}`;
  }

  function isDuplicateRecord(doc, existingDocs) {
    if (!doc || !Array.isArray(existingDocs)) return false;
    const sig = getDocSignature(doc);

    return existingDocs.some(existing => {
      if (doc.id && existing.id === doc.id) return false;
      return getDocSignature(existing) === sig;
    });
  }

  /**
   * Opens / initializes IndexedDB
   */
  function initDB() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error('IndexedDB is not supported by this browser.'));
        return;
      }

      const request = global.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('docType', 'docType', { unique: false });
          store.createIndex('taxYear', 'taxYear', { unique: false });
          store.createIndex('payDate', 'payDate', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
          db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = function (event) {
        resolve(event.target.result);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to open IndexedDB'));
      };
    });
  }

  /**
   * Saves or updates an encrypted document in IndexedDB
   */
  async function saveDocument(doc) {
    const db = await initDB();
    const record = Object.assign({}, doc);
    if (!record.id) {
      record.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    if (!record.createdAt) {
      record.createdAt = new Date().toISOString();
    }
    record.updatedAt = new Date().toISOString();

    if (!record.taxYear) {
      record.taxYear = getTaxYear(record.payDate || record.leavingDate || record.createdAt);
    } else {
      record.taxYear = getTaxYear(record.taxYear);
    }

    // Encrypt sensitive fields before put
    const cipherRecord = await encryptRecord(record);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(cipherRecord);

      request.onsuccess = function () {
        resolve(record); // Return plain record object in memory
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to save document'));
      };
    });
  }

  /**
   * Retrieves and decrypts all documents from IndexedDB
   */
  async function getAllDocuments() {
    const db = await initDB();
    const cipherDocs = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = function () {
        resolve(request.result || []);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to get documents'));
      };
    });

    // Decrypt all records in parallel
    const plainDocs = await Promise.all(cipherDocs.map(cDoc => decryptRecord(cDoc)));

    plainDocs.sort((a, b) => {
      const dateA = new Date(a.payDate || a.leavingDate || a.createdAt);
      const dateB = new Date(b.payDate || b.leavingDate || b.createdAt);
      return dateB - dateA;
    });

    return plainDocs;
  }

  /**
   * Retrieves and decrypts a document by ID
   */
  async function getDocumentById(id) {
    const db = await initDB();
    const cipherDoc = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = function () {
        resolve(request.result || null);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to get document'));
      };
    });

    if (!cipherDoc) return null;
    return await decryptRecord(cipherDoc);
  }

  /**
   * Deletes a document by ID
   */
  async function deleteDocument(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = function () {
        resolve(true);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to delete document'));
      };
    });
  }

  /**
   * Clears all documents
   */
  async function clearAllDocuments() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = function () {
        resolve(true);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to clear documents'));
      };
    });
  }

  // Export to global object
  global.TaxDB = {
    getTaxYear,
    getTaxMonthNum,
    formatCurrency,
    getDocSignature,
    isDuplicateRecord,
    encryptRecord,
    decryptRecord,
    initDB,
    saveDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
    clearAllDocuments
  };

})(typeof window !== 'undefined' ? window : globalThis);
