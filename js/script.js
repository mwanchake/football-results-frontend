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
      // Otherwise show '-' for each team for unplayed matches. This also handles cases where the
      // backend still returns 0-0 placeholders (we treat 0-0 without matchTime as unplayed).
      // Always display numeric scores (default to 0) — shows 0–0 for unplayed fixtures
      // Determine score / status display
      const homeGoals = (typeof m.homeGoals === 'number') ? m.homeGoals : null;
      const awayGoals = (typeof m.awayGoals === 'number') ? m.awayGoals : null;
      const statusRaw = (m.matchStatus || '').toString();
      const status = statusRaw.toLowerCase();
      const isFinished = status.includes('ft') || status.includes('finished') || status.includes('full time');
      const isInPlay = status && !isFinished;

      // If match is finished -> show 'FT'
      // If match is not played yet (no goals and not in-play) -> show the kickoff time instead of 0-0
      // Otherwise show numeric scores
      let scoresHtml = '';
      if (isFinished) {
        scoresHtml = `<div class="score-status">FT</div>`;
      } else if ((homeGoals === null && awayGoals === null) || (homeGoals === 0 && awayGoals === 0 && !isInPlay)) {
        // upcoming or not-yet-played: show time in the scores area for emphasis
        scoresHtml = `<div class="score-status">${escapeHtml(time || '')}</div>`;
      } else {
        const left = homeGoals !== null ? String(homeGoals) : '-';
        const right = awayGoals !== null ? String(awayGoals) : '-';
        scoresHtml = `<div class="score-number">${escapeHtml(left)}</div><div class="score-number">${escapeHtml(right)}</div>`;
      }

      const homeLogoHtml = m.homeLogo ? `<img src="${escapeHtml(m.homeLogo)}" class="team-logo" alt="${escapeHtml(m.home || '')}">` : '';
      const awayLogoHtml = m.awayLogo ? `<img src="${escapeHtml(m.awayLogo)}" class="team-logo" alt="${escapeHtml(m.away || '')}">` : '';

      // Vertical card layout: league groups list match cards top-down.
      // Each match card shows teams (left, stacked), time/status (center), and scores (right, stacked).
      matchDiv.innerHTML = `
        <div class="match-card-content">
          <div class="teams-vertical">
            <div class="team-row">${homeLogoHtml}<span>${escapeHtml(m.home || '-')}</span></div>
            <div class="team-row">${awayLogoHtml}<span>${escapeHtml(m.away || '-')}</span></div>
          </div>
          <div class="match-meta">
            <div class="time">${escapeHtml(time)}</div>
            <div class="status">${escapeHtml(m.matchStatus || '')}</div>
          </div>
          <div class="scores-vertical">
            ${scoresHtml}
          </div>
        </div>
      `;
      leagueSection.appendChild(matchDiv);
    });

    resultsContainer.appendChild(leagueSection);
  });
}

fetchBtn.addEventListener("click", fetchMatches);
// Adjust `main` top padding to match the fixed header height so content isn't hidden
function adjustMainPadding(){
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  if (!header || !main) return;
  const extra = 8; // small breathing room
  main.style.paddingTop = (header.offsetHeight + extra) + 'px';
}

window.onload = () => {
  loadLeagues();
  fetchMatches();
  adjustMainPadding();
  window.addEventListener('resize', adjustMainPadding);
};

// Header compact behavior on scroll: shrink header slightly when user scrolls down
(() => {
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  if (!header || !main) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  function onScroll() {
    lastScrollY = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (lastScrollY > 24) {
          header.classList.add('header--compact');
        } else {
          header.classList.remove('header--compact');
        }
        // keep main padding in sync with header height
        main.style.paddingTop = (header.offsetHeight + 8) + 'px';
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // also handle touchmove for some mobile browsers
  window.addEventListener('touchmove', onScroll, { passive: true });
})();
