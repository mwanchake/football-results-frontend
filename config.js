// Frontend runtime configuration.
// Set `window.__API_BASE__` to your deployed backend URL (e.g. https://my-backend.onrender.com)
// This file can be changed on the server without rebuilding the JS.

(function () {
  if (typeof window === 'undefined') return;
  // If not already set by environment or hosting, default to localhost for local dev
  if (!window.__API_BASE__) {
    // Default to the deployed backend on Render — change this if you deploy elsewhere
    window.__API_BASE__ = 'https://ootball-results-backend.onrender.com';
  }
})();
