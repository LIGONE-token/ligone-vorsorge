document.addEventListener("DOMContentLoaded", () => {

/* =====================================================
   LIGONE – Investitionssimulation (STABIL / FINAL)
   Realistisch | Tages-Schlusskurse | localStorage
===================================================== */

const STORAGE_KEY = "ligone_simulation_v1";

/* ================== KURSSTATUS ================== */

let lastDailyClose = null;       // number
let lastDailyCloseDate = null;   // "YYYY-MM-DD"

/* ================== INVESTMENT-STATUS ================== */

let investmentAmount = null; // €
let entryPrice = null;       // Schlusskurs
let entryDate = null;        // Datum des Schlusskurses
let tokenAmount = null;      // LIGONE-Token
let priceHistory = [];       // [{ date, close }]

/* ================== DOM ================== */

const $ = id => document.getElementById(id);

const startDateDisplay = $("startDateDisplay");
const startStatus      = $("startStatus");
const resultSection    = document.querySelector(".simulation-result");
const chartSection     = document.querySelector(".simulation-chart");
const amountButtons    = document.querySelectorAll(".amount-buttons button");

/* ================== STARTDATUM = HEUTE ================== */

const today = new Date().toISOString().slice(0, 10);
startDateDisplay.textContent = today;

/* ================== FORMAT ================== */

function formatEUR(v) {
  return Number(v).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " €";
}

function formatPrice(v) {
  return Number(v).toLocaleString("de-DE", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  });
}

/* ================== localStorage ================== */

function saveSimulation() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    investmentAmount,
    entryPrice,
    entryDate,
    tokenAmount,
    priceHistory,
    lastDailyClose,
    lastDailyCloseDate
  }));
}

function loadSimulation() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    startStatus.textContent =
      "Marktstart – wartet auf ersten Tages-Schlusskurs";
    return false;
  }

  try {
    const d = JSON.parse(raw);

    investmentAmount   = Number(d.investmentAmount);
    entryPrice         = Number(d.entryPrice);
    entryDate          = d.entryDate || null;
    tokenAmount        = Number(d.tokenAmount);
    priceHistory       = Array.isArray(d.priceHistory) ? d.priceHistory : [];
    lastDailyClose     = Number(d.lastDailyClose);
    lastDailyCloseDate = d.lastDailyCloseDate || null;

    if (lastDailyClose && lastDailyCloseDate && entryPrice) {
      startStatus.textContent =
        "Aktiv · letzter Schlusskurs vom " + lastDailyCloseDate;
      updateResult();
      updateChart();
    } else {
      startStatus.textContent =
        "Marktstart – wartet auf ersten Tages-Schlusskurs";
    }

    return true;

  } catch (e) {
    console.error("Simulation konnte nicht geladen werden", e);
    startStatus.textContent =
      "Marktstart – wartet auf ersten Tages-Schlusskurs";
    return false;
  }
}

window.resetSimulation = function () {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};

/* ================== KURSQUELLE (DEMO / PLATZHALTER) ================== */

async function loadLatestDailyClose() {
  // ⚠️ Platzhalter – später durch echte Tages-Schlusskurse ersetzen
  lastDailyClose = 0.00000123;
  lastDailyCloseDate = today;
}

/* ================== EINSTIEG ================== */

amountButtons.forEach(btn => {
  btn.addEventListener("click", async () => {

    const amount = Number(btn.dataset.amount);
    if (!amount) return;

    if (!lastDailyClose || !lastDailyCloseDate) {
      await loadLatestDailyClose();
    }

    if (!lastDailyClose || !lastDailyCloseDate) {
      startStatus.textContent =
        "Wartet auf nächsten Tages-Schlusskurs";
      return;
    }

    // Einstieg nur einmal fixieren
    if (!entryPrice) {
      investmentAmount = amount;
      entryPrice = lastDailyClose;
      entryDate  = lastDailyCloseDate;
      tokenAmount = investmentAmount / entryPrice;

      priceHistory.push({
        date: entryDate,
        close: entryPrice
      });

      startStatus.textContent =
        "Aktiv · Einstieg zum Schlusskurs vom " + entryDate;

      saveSimulation();
    }

    updateResult();
    updateChart();
  });
});

/* ================== ANZEIGE ================== */

function updateResult() {
  if (!entryPrice || !lastDailyClose || !lastDailyCloseDate) return;

  $("res-amount").textContent = formatEUR(investmentAmount);
  $("res-buy-price").textContent =
    formatPrice(entryPrice) + " (Schlusskurs)";
  $("res-buy-date").textContent = entryDate;

  const currentValue = tokenAmount * lastDailyClose;
  const changePct =
    ((currentValue - investmentAmount) / investmentAmount) * 100;

  $("res-current-price").textContent =
    formatPrice(lastDailyClose) +
    " (Schlusskurs vom " + lastDailyCloseDate + ")";

  $("res-value").textContent = formatEUR(currentValue);
  $("res-change").textContent =
    (changePct >= 0 ? "+" : "") +
    changePct.toFixed(2).replace(".", ",") + " %";

  resultSection.hidden = false;
}

/* ================== CHART ================== */

let chart = null;

function updateChart() {
  if (priceHistory.length < 2) {
    chartSection.hidden = true;
    return;
  }

  chartSection.hidden = false;

  const ctx = document
    .getElementById("investmentChart")
    .getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: priceHistory.map(p => p.date),
      datasets: [{
        data: priceHistory.map(p => tokenAmount * p.close),
        tension: 0.3
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { callback: v => formatEUR(v) }
        }
      }
    }
  });
}

/* ================== INIT ================== */

loadSimulation();

});
