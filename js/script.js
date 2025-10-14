const baseURL = "https://football-results-backend.onrender.com";

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
    leagues.forEach(l => {
      const option = document.createElement("option");
      option.value = l.id;
      option.textContent = `${l.name} (${l.country})`;
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
    const data = await res.json();
    displayMatches(data.response);
  } catch (err) {
    resultsContainer.innerHTML = `<p style='color:red'>Error fetching data</p>`;
    console.error("Fetch error:", err);
  }
}

// ✅ Display matches correctly for API-Football style
function displayMatches(matches) {
  resultsContainer.innerHTML = '';

  if (!matches || matches.length === 0) {
    resultsContainer.innerHTML = '<p>No matches found for this date.</p>';
    return;
  }

  // Group by league
  const groupedLeagues = {};
  matches.forEach(match => {
    const leagueName = match.league?.name || "Unknown League";
    const leagueLogo = match.league?.logo || "";

    if (!groupedLeagues[leagueName]) {
      groupedLeagues[leagueName] = { logo: leagueLogo, matches: [] };
    }
    groupedLeagues[leagueName].matches.push(match);
  });

  // Render
  Object.keys(groupedLeagues).forEach(leagueName => {
    const { logo, matches } = groupedLeagues[leagueName];
    const leagueSection = document.createElement("div");
    leagueSection.classList.add("league-section");

    leagueSection.innerHTML = `
      <div class="league-header">
        ${logo ? `<img src="${logo}" alt="${leagueName}" class="league-logo">` : ""}
        <h2>${leagueName}</h2>
      </div>
    `;

    matches.forEach(match => {
      const matchDiv = document.createElement("div");
      matchDiv.classList.add("match-card");

      const home = match.teams?.home;
      const away = match.teams?.away;
      const goals = match.goals;
      const date = match.fixture?.date ? new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A";

      matchDiv.innerHTML = `
        <div class="teams">
          <div class="team">
            ${home?.logo ? `<img src="${home.logo}" class="team-logo" alt="${home.name}">` : ""}
            <span>${home?.name || "-"}</span>
          </div>
          <span class="score">${goals?.home ?? "-"} - ${goals?.away ?? "-"}</span>
          <div class="team">
            ${away?.logo ? `<img src="${away.logo}" class="team-logo" alt="${away.name}">` : ""}
            <span>${away?.name || "-"}</span>
          </div>
        </div>
        <p class="match-time">${date}</p>
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
