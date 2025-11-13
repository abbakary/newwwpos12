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
    return metaTag.getAttribute('content');
  }

  // Fallback to form field
  const tokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
  if (tokenInput) {
    return tokenInput.value;
  }

  // If not found, return null
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
  const formData = data instanceof FormData ? data : new FormData();

  // If data is a plain object (not FormData), convert it
  if (!(data instanceof FormData) && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
  }

  // Add CSRF token to form data
  const csrfToken = getCSRFToken();
  if (csrfToken && !data.csrfmiddlewaretoken) {
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
