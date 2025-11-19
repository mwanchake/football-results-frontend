// Frontend runtime configuration.
// Set `window.__API_BASE__` to your deployed backend URL (e.g. https://my-backend.onrender.com)
// This file can be changed on the server without rebuilding the JS.

(function () {
  if (typeof window === 'undefined') return;
  // If not already set by environment or hosting, default to localhost for local dev
  if (!window.__API_BASE__) {
    window.__API_BASE__ = 'http://localhost:8080';
  }
})();
