document.addEventListener("DOMContentLoaded", () => {

/* =====================================================
   LIGONE – Investitionssimulation (FINAL)
   Realistisch | Tages-Schlusskurse | localStorage
===================================================== */

/* ================== KONFIG ================== */

const STORAGE_KEY = "ligone_simulation_v1";

/*
  HINWEIS:
  lastDailyClose & lastDailyCloseDate kommen später
  aus einer echten Quelle (Cron / Supabase).
  Aktuell Platzhalter, damit alles sauber läuft.
*/
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

/* =====================================================
   localStorage
===================================================== */

function saveSimulation() {
  const data = {
    investmentAmount,
    entryPrice,
    entryDate,
    tokenAmount,
    priceHistory,
    lastDailyClose,
    lastDailyCloseDate
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


function loadSimulation() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);

    investmentAmount   = data.investmentAmount;
    entryPrice         = data.entryPrice;
    entryDate          = data.entryDate;
    tokenAmount        = data.tokenAmount;
    priceHistory       = data.priceHistory || [];
    lastDailyClose     = data.lastDailyClose;
    lastDailyCloseDate = data.lastDailyCloseDate;

    startStatus.textContent = "Aktiv (lokal gespeichert)";

    updateResult();
    updateChart();

    return true;
  } catch (e) {
    console.error("Simulation konnte nicht geladen werden", e);
    return false;
  }
}

window.resetSimulation = function () {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};

/* =====================================================
   KURSQUELLE (PLATZHALTER)
===================================================== */

/*
  Diese Funktion wird später durch echte Daten ersetzt.
  Sie MUSS liefern:
  - lastDailyClose
  - lastDailyCloseDate
*/
async function loadLatestDailyClose() {

  // ⚠️ TEMPORÄRER DEMO-WERT
  lastDailyClose = 0.00000123;
  lastDailyCloseDate = today;

}

/* =====================================================
   EINSTIEG (Button-Klick)
===================================================== */

amountButtons.forEach(btn => {
  btn.addEventListener("click", async () => {

    const amount = Number(btn.dataset.amount);
    if (!amount) return;

    // Schlusskurs laden (falls noch nicht vorhanden)
    if (!lastDailyClose) {
      await loadLatestDailyClose();
    }

    // Noch kein Tagesabschluss → warten
    if (!lastDailyClose || !lastDailyCloseDate) {
      startStatus.textContent =
        "Noch kein Tages-Schlusskurs verfügbar";
      return;
    }

    // Einstieg NUR EINMAL setzen
    if (!entryPrice) {
  investmentAmount = amount;
  entryPrice = lastDailyClose;
  entryDate  = lastDailyCloseDate;
  tokenAmount = investmentAmount / entryPrice;

  priceHistory.push({
    date: entryDate,
    close: entryPrice
  });

  startStatus.textContent = "Aktiv (Einstieg erfolgt)";
  saveSimulation();
}

    updateResult();
    updateChart();
  });
});

/* =====================================================
   ANZEIGE
===================================================== */

function updateResult() {
  if (!entryPrice) return;

  $("res-amount").textContent = formatEUR(investmentAmount);
  $("res-buy-price").textContent =
    formatPrice(entryPrice) + " (Schlusskurs)";
  $("res-buy-date").textContent = entryDate;

  const currentValue = tokenAmount * lastDailyClose;
  const changePct =
    ((currentValue - investmentAmount) / investmentAmount) * 100;

  $("res-current-price").textContent =
    formatPrice(lastDailyClose) + " (letzter Schlusskurs)";
  $("res-value").textContent = formatEUR(currentValue);
  $("res-change").textContent =
    (changePct >= 0 ? "+" : "") +
    changePct.toFixed(2).replace(".", ",") + " %";

  resultSection.hidden = false;
}

/* =====================================================
   CHART – erst ab 2 Schlusskursen
===================================================== */

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

  const labels = priceHistory.map(p => p.date);
  const values = priceHistory.map(p =>
    tokenAmount * p.close
  );

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        tension: 0.3
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: v => formatEUR(v)
          }
        }
      }
    }
  });
}

/* =====================================================
   BEIM SEITENSTART: gespeicherte Simulation laden
===================================================== */

loadSimulation();

});
