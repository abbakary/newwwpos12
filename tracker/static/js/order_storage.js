/**
 * Order Storage Utility - Manages temporary order data in localStorage
 * Used to preserve order information during start-time capture and order creation flow
 */

const OrderStorage = {
  /**
   * Store temporary order data when starting an order
   * @param {Object} orderData - Order data to store {order_id, plate_number, order_number, started_at, customer_id, vehicle_id}
   */
  storeTemporaryOrder: function(orderData) {
    try {
      const data = {
        ...orderData,
        storedAt: new Date().toISOString(),
      };
      localStorage.setItem('temp_order_data', JSON.stringify(data));
      console.debug('Stored temporary order:', data);
      return true;
    } catch (e) {
      console.error('Failed to store temporary order:', e);
      return false;
    }
  },

  /**
   * Retrieve temporary order data
   * @returns {Object|null} - Stored order data or null if not found
   */
  getTemporaryOrder: function() {
    try {
      const stored = localStorage.getItem('temp_order_data');
      if (!stored) return null;
      const data = JSON.parse(stored);
      return data;
    } catch (e) {
      console.error('Failed to retrieve temporary order:', e);
      return null;
    }
  },

  /**
   * Clear temporary order data
   */
  clearTemporaryOrder: function() {
    try {
      localStorage.removeItem('temp_order_data');
      console.debug('Cleared temporary order');
      return true;
    } catch (e) {
      console.error('Failed to clear temporary order:', e);
      return false;
    }
  },

  /**
   * Store extracted customer data from invoice/PDF
   * @param {Object} customerData - Customer data extracted {name, phone, email, ...}
   */
  storeExtractedCustomerData: function(customerData) {
    try {
      const data = {
        ...customerData,
        extractedAt: new Date().toISOString(),
      };
      localStorage.setItem('extracted_customer_data', JSON.stringify(data));
      console.debug('Stored extracted customer data:', data);
      return true;
    } catch (e) {
      console.error('Failed to store extracted customer data:', e);
      return false;
    }
  },

  /**
   * Retrieve extracted customer data
   * @returns {Object|null} - Extracted customer data or null
   */
  getExtractedCustomerData: function() {
    try {
      const stored = localStorage.getItem('extracted_customer_data');
      if (!stored) return null;
      const data = JSON.parse(stored);
      return data;
    } catch (e) {
      console.error('Failed to retrieve extracted customer data:', e);
      return null;
    }
  },

  /**
   * Clear extracted customer data
   */
  clearExtractedCustomerData: function() {
    try {
      localStorage.removeItem('extracted_customer_data');
      console.debug('Cleared extracted customer data');
      return true;
    } catch (e) {
      console.error('Failed to clear extracted customer data:', e);
      return false;
    }
  },

  /**
   * Store temporary invoice line items for modal workflow
   * @param {Array} lineItems - Array of invoice line items
   */
  storeInvoiceLineItems: function(lineItems) {
    try {
      const data = {
        lineItems: lineItems || [],
        storedAt: new Date().toISOString(),
      };
      localStorage.setItem('temp_invoice_items', JSON.stringify(data));
      console.debug('Stored invoice line items:', lineItems);
      return true;
    } catch (e) {
      console.error('Failed to store invoice line items:', e);
      return false;
    }
  },

  /**
   * Retrieve temporary invoice line items
   * @returns {Array|null} - Stored line items or null
   */
  getInvoiceLineItems: function() {
    try {
      const stored = localStorage.getItem('temp_invoice_items');
      if (!stored) return null;
      const data = JSON.parse(stored);
      return data.lineItems || null;
    } catch (e) {
      console.error('Failed to retrieve invoice line items:', e);
      return null;
    }
  },

  /**
   * Clear invoice line items
   */
  clearInvoiceLineItems: function() {
    try {
      localStorage.removeItem('temp_invoice_items');
      console.debug('Cleared invoice line items');
      return true;
    } catch (e) {
      console.error('Failed to clear invoice line items:', e);
      return false;
    }
  },

  /**
   * Clear all temporary data (order, customer, invoice)
   */
  clearAllTemporaryData: function() {
    try {
      this.clearTemporaryOrder();
      this.clearExtractedCustomerData();
      this.clearInvoiceLineItems();
      console.debug('Cleared all temporary data');
      return true;
    } catch (e) {
      console.error('Failed to clear all temporary data:', e);
      return false;
    }
  },

  /**
   * Check if data is stale (older than specified minutes)
   * @param {string} key - localStorage key
   * @param {number} minutesOld - Age threshold in minutes
   * @returns {boolean} - True if data is stale
   */
  isDataStale: function(key, minutesOld = 60) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return true;
      const data = JSON.parse(stored);
      if (!data.storedAt && !data.extractedAt) return false;
      const timestamp = new Date(data.storedAt || data.extractedAt);
      const now = new Date();
      const minutes = (now - timestamp) / (1000 * 60);
      return minutes > minutesOld;
    } catch (e) {
      console.error('Failed to check data staleness:', e);
      return true;
    }
  },

  /**
   * Auto-cleanup stale data
   * @param {number} minutesOld - Age threshold in minutes
   */
  cleanupStaleData: function(minutesOld = 120) {
    try {
      const keys = [
        'temp_order_data',
        'extracted_customer_data',
        'temp_invoice_items',
      ];
      keys.forEach(key => {
        if (this.isDataStale(key, minutesOld)) {
          localStorage.removeItem(key);
          console.debug('Cleaned up stale data:', key);
        }
      });
    } catch (e) {
      console.error('Failed to cleanup stale data:', e);
    }
  },
};

// Auto-cleanup stale data when page loads
document.addEventListener('DOMContentLoaded', function() {
  OrderStorage.cleanupStaleData(120);
});
