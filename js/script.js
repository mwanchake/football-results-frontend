// Use runtime-configured backend URL if provided via `frontend/config.js`.
// Falls back to the deployed Render backend so the static site works without
// needing a separate `config.js` file. Change this if you redeploy backend.
const baseURL = (typeof window !== 'undefined' && window.__API_BASE__) ? window.__API_BASE__ : 'https://ootball-results-backend.onrender.com';

const dateInput = document.getElementById("dateInput");
const leagueSelect = document.getElementById("leagueSelect");
const fetchBtn = document.getElementById("fetchBtn");
const resultsContainer = document.getElementById("resultsContainer");

// Default to today's date
const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;

// ✅ Load all leagues
async function loadLeagues() {
  try {
    const res = await fetch(`${baseURL}/api/leagues`);
    const leagues = await res.json();
    // leagues is a simple array of league names (strings)
    leagues.forEach(name => {
      const option = document.createElement("option");
      option.value = name || "";
      option.textContent = name || "(unknown)";
      leagueSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading leagues:", error);
  }
}

// ✅ Fetch matches from backend
async function fetchMatches() {
  const date = dateInput.value;
  const league = leagueSelect.value;
  resultsContainer.innerHTML = "<p class='loading'>Loading results...</p>";

  try {
    const res = await fetch(`${baseURL}/api/matches?date=${date}&league=${league}`);
    if (!res.ok) {
      // Try to extract server message if present (log for debugging) but show a generic message to users
      const text = await res.text().catch(() => res.statusText || 'Unknown error');
      showError(`Server error ${res.status}. Please try again later.`);
      console.error('Server error:', res.status, text);
      return;
    }

    const matches = await res.json();
    // matches is an array of MatchDto objects: {id, league, home, away, homeGoals, awayGoals, matchDate}
    displayMatches(matches);
  } catch (err) {
    // Network-level errors (DNS, ECONNREFUSED, CORS fail, request blocked, etc.) surface as TypeError in fetch
    if (err instanceof TypeError) {
      // Generic message for users; log details (including baseURL) for developers
      showError('Network error: Unable to reach the server. Please try again later.');
      console.error('Network error while fetching matches from', baseURL, err);
    } else {
      showError('Unexpected error: Please try again later.');
      console.error('Unexpected fetch error while calling', baseURL, err);
    }
  }
}

// Show a user-friendly error message in the results area and offer a retry button
function showError(message) {
  resultsContainer.innerHTML = `
    <div class="error-block">
      <p style="color:red">${escapeHtml(message)}</p>
      <button id="retryBtn" class="btn">Retry</button>
    </div>`;

  const retry = document.getElementById('retryBtn');
  if (retry) retry.addEventListener('click', () => {
    fetchMatches();
  });
}

// Minimal HTML escape to avoid injection when showing server text
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ✅ Display matches correctly for API-Football style
function displayMatches(matches) {
  resultsContainer.innerHTML = '';

  if (!matches || matches.length === 0) {
    resultsContainer.innerHTML = '<p>No matches found for this date.</p>';
    return;
  }

  // Group by league (simple MatchDto shape)
  const grouped = {};
  matches.forEach(m => {
    const leagueName = m.league || 'Unknown League';
    if (!grouped[leagueName]) grouped[leagueName] = [];
    grouped[leagueName].push(m);
  });

  Object.keys(grouped).forEach(leagueName => {
    const leagueSection = document.createElement('div');
    leagueSection.classList.add('league-section');
    leagueSection.innerHTML = `<div class="league-header"><h2>${leagueName}</h2></div>`;

    grouped[leagueName].forEach(m => {
      const matchDiv = document.createElement('div');
      matchDiv.classList.add('match-card');
      // Prefer explicit match_time if present (string like "HH:mm"); otherwise fall back to matchDate ISO
      let time = '';
      if (m.matchTime && String(m.matchTime).trim() !== '') {
        time = m.matchTime;
      } else if (m.matchDate) {
        try {
          time = new Date(m.matchDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        } catch (e) {
          time = '';
        }
      } else {
        time = 'TBA';
      }
      // Only show a numeric score when both goals are present and the fixture appears played.
      // Otherwise show '-:-' for unplayed matches. This also handles cases where the
      // backend still returns 0-0 placeholders (we treat 0-0 without matchTime as unplayed).
      let scoreText;
      if (typeof m.homeGoals === 'number' && typeof m.awayGoals === 'number') {
        // If both are zero and there's no explicit matchTime, treat as unplayed
        if (m.homeGoals === 0 && m.awayGoals === 0 && (!m.matchTime || String(m.matchTime).trim() === '')) {
          scoreText = '-:-';
        } else {
          scoreText = `${m.homeGoals} - ${m.awayGoals}`;
        }
      } else {
        scoreText = '-:-';
      }

      matchDiv.innerHTML = `
        <div class="teams">
          <div class="team"><span>${escapeHtml(m.home || '-')}</span></div>
          <span class="score">${scoreText}</span>
          <div class="team"><span>${escapeHtml(m.away || '-')}</span></div>
        </div>
        <p class="match-time">${escapeHtml(time)}</p>
      `;
      leagueSection.appendChild(matchDiv);
    });

    resultsContainer.appendChild(leagueSection);
  });
}

fetchBtn.addEventListener("click", fetchMatches);
window.onload = () => {
  loadLeagues();
  fetchMatches();
};
