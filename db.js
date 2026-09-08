/**
 * db.js - IndexedDB storage and UK Tax Year utility helper functions
 * UK Tax Document Management PWA
 */

(function (global) {
  'use strict';

  const DB_NAME = 'UKTaxDocsDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'documents';

  /**
   * Calculates the UK Tax Year for a given date.
   * UK Tax Year runs from 6th April (Year N) to 5th April (Year N+1).
   * @param {string|Date} inputDate
   * @returns {string} Tax year in format "YYYY-YYYY" (e.g. "2025-2026")
   */
  function getTaxYear(inputDate) {
    if (!inputDate) {
      const now = new Date();
      return getTaxYear(now);
    }

    // If input is already a tax year string like "2025-2026" or "2025/26"
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
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    // Before April 6th belongs to previous tax year
    if (month < 4 || (month === 4 && day < 6)) {
      return `${year - 1}-${year}`;
    } else {
      return `${year}-${year + 1}`;
    }
  }

  /**
   * Determines the UK Tax Month (1 to 12) for a given date.
   * Tax Month 1: 6 April - 5 May
   * Tax Month 12: 6 March - 5 April
   * @param {string|Date} inputDate
   * @returns {number} 1 - 12
   */
  function getTaxMonthNum(inputDate) {
    const date = new Date(inputDate);
    if (isNaN(date.getTime())) return 1;

    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    if (month === 4) {
      return day >= 6 ? 1 : 12;
    } else if (month > 4) {
      return day >= 6 ? month - 3 : month - 4;
    } else { // month 1..3
      return day >= 6 ? month + 9 : month + 8;
    }
  }

  /**
   * Helper to format currency in GBP (£)
   * @param {number|string} value
   * @returns {string}
   */
  function formatCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(num);
  }

  /**
   * Opens / initializes IndexedDB
   * @returns {Promise<IDBDatabase>}
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
   * Saves or updates a document in IndexedDB
   * @param {Object} doc
   * @returns {Promise<Object>} saved document
   */
  async function saveDocument(doc) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = Object.assign({}, doc);
      if (!record.id) {
        record.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }
      if (!record.createdAt) {
        record.createdAt = new Date().toISOString();
      }
      record.updatedAt = new Date().toISOString();

      // Ensure taxYear is present
      if (!record.taxYear) {
        record.taxYear = getTaxYear(record.payDate || record.leavingDate || record.createdAt);
      } else {
        record.taxYear = getTaxYear(record.taxYear);
      }

      const request = store.put(record);

      request.onsuccess = function () {
        resolve(record);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to save document'));
      };
    });
  }

  /**
   * Retrieves all documents from IndexedDB
   * @returns {Promise<Array>}
   */
  async function getAllDocuments() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = function () {
        const docs = request.result || [];
        // Sort descending by payDate or createdAt
        docs.sort((a, b) => {
          const dateA = new Date(a.payDate || a.leavingDate || a.createdAt);
          const dateB = new Date(b.payDate || b.leavingDate || b.createdAt);
          return dateB - dateA;
        });
        resolve(docs);
      };

      request.onerror = function (event) {
        reject(event.target.error || new Error('Failed to get documents'));
      };
    });
  }

  /**
   * Retrieves a document by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async function getDocumentById(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
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
  }

  /**
   * Deletes a document by ID
   * @param {string} id
   * @returns {Promise<boolean>}
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
   * Clears all documents (useful for testing or reset)
   * @returns {Promise<boolean>}
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
    initDB,
    saveDocument,
    getAllDocuments,
    getDocumentById,
    deleteDocument,
    clearAllDocuments
  };

})(typeof window !== 'undefined' ? window : globalThis);
