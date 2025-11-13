/**
 * CSRF Token Helper
 * Provides utility functions to retrieve CSRF tokens from meta tags or form fields
 */

/**
 * Get CSRF token from meta tag or form field
 * @returns {string|null} The CSRF token or null if not found
 */
function getCSRFToken() {
  // First try to get from meta tag (preferred method)
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    const token = metaTag.getAttribute('content');
    if (token && token.length > 0) {
      return token;
    }
  }

  // Fallback to form field
  const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (tokenInput && tokenInput.value) {
    return tokenInput.value;
  }

  // If not found, log warning and return null
  console.warn('CSRF token not found in meta tag or form fields. Some requests may fail.');
  return null;
}

/**
 * Make a fetch request with CSRF token automatically included
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} The fetch promise
 */
function fetchWithCSRF(url, options = {}) {
  const csrfToken = getCSRFToken();

  if (!csrfToken) {
    console.warn('CSRF token not found. Request may fail.');
  }

  // Prepare headers
  const headers = options.headers || {};
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  headers['X-Requested-With'] = 'XMLHttpRequest';

  // Return fetch with merged options
  return fetch(url, {
    ...options,
    headers: headers,
  });
}

/**
 * Post form data with CSRF token automatically included
 * @param {string} url - The URL to POST to
 * @param {FormData|object} data - Form data or object
 * @returns {Promise} The fetch promise
 */
function postWithCSRF(url, data = {}) {
  let formData;

  // If data is already FormData, use it directly
  if (data instanceof FormData) {
    formData = data;
  } else {
    // Create new FormData and populate from object
    formData = new FormData();
    if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
    }
  }

  // Add CSRF token to form data if not already present
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    formData.append('csrfmiddlewaretoken', csrfToken);
  }

  return fetchWithCSRF(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Post JSON with CSRF token automatically included
 * @param {string} url - The URL to POST to
 * @param {object} data - JSON data
 * @returns {Promise} The fetch promise
 */
function postJSONWithCSRF(url, data = {}) {
  const csrfToken = getCSRFToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  return fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data),
  });
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  // If showToast function is already defined globally, use it
  if (typeof window.showToast === 'function' && window.showToast !== arguments.callee) {
    window.showToast(message, type);
    return;
  }

  // Create a simple toast fallback
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();

  const toast = document.createElement('div');
  toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  toast.role = 'alert';
  toast.style.marginBottom = '10px';

  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const icon = iconMap[type] || 'fa-info-circle';

  toast.innerHTML = `
    <i class="fa ${icon} me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  toastContainer.appendChild(toast);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.maxWidth = '400px';
    document.body.appendChild(container);
  }
  return container;
}
