const baseURL = "https://football-results-backend.onrender.com";

const dateInput = document.getElementById("dateInput");
const leagueSelect = document.getElementById("leagueSelect");
const fetchBtn = document.getElementById("fetchBtn");
const resultsContainer = document.getElementById("resultsContainer");

// Set today's date by default
const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;

// Load leagues
async function loadLeagues() {
  const res = await fetch(`${baseURL}/api/leagues`);
  const leagues = await res.json();
  leagues.forEach(l => {
    const option = document.createElement("option");
    option.value = l.id;
    option.textContent = `${l.name} (${l.country})`;
    leagueSelect.appendChild(option);
  });
}

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

function displayMatches(matches) {
  if (!matches || matches.length === 0) {
    resultsContainer.innerHTML = "<p>No matches found.</p>";
    return;
  }

  resultsContainer.innerHTML = "";
  matches.forEach(match => {
    const div = document.createElement("div");
    div.className = "match";
    div.innerHTML = `
      <h3>${match.league.name}</h3>
      <p>${match.teams.home.name} vs ${match.teams.away.name}</p>
      <p><strong>${match.goals.home ?? 0} - ${match.goals.away ?? 0}</strong></p>
      <p>${new Date(match.fixture.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
    `;
    resultsContainer.appendChild(div);
  });
}

fetchBtn.addEventListener("click", fetchMatches);
window.onload = () => {
  loadLeagues();
  fetchMatches();
};
