document.addEventListener("DOMContentLoaded", () => {

/* =====================================================
   LIGONE – Investitionssimulation (FINAL)
   Modell: Echtstart, Tages-Schlusskurse, kein Rückblick
===================================================== */

/* ====== KONFIG ====== */

// HIER später echte Quelle einsetzen (z. B. Supabase / Cron)
// Aktuell: Platzhalter für letzten bekannten Tages-Schlusskurs
let lastDailyClose = null;       // number
let lastDailyCloseDate = null;   // "YYYY-MM-DD"

// gespeicherter Verlauf ab Einstieg
let priceHistory = []; // [{ date, close }]

// Investment-Zustand
let investmentAmount = null;
let entryPrice = null;
let entryDate = null;
let tokenAmount = null;

/* ====== ELEMENTE ====== */
const $ = id => document.getElementById(id);

const startDateDisplay = $("startDateDisplay");
const startStatus      = $("startStatus");

const resultSection = document.querySelector(".simulation-result");
const chartSection  = document.querySelector(".simulation-chart");

const amountButtons = document.querySelectorAll(".amount-buttons button");

/* ====== STARTDATUM = HEUTE ====== */
const today = new Date().toISOString().slice(0, 10);
startDateDisplay.textContent = today;

/* ====== FORMAT ====== */
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
   KURSLOGIK (REALISTISCH)
   - Es gibt nur Tages-Schlusskurse
   - Einstieg erst, wenn ein Close existiert
===================================================== */

/*
  Diese Funktion MUSS später durch echte Daten ersetzt werden.
  Erwartet:
  - close: number
  - date:  YYYY-MM-DD
*/
async function loadLatestDailyClose() {
  /*
    BEISPIEL (Platzhalter):
    lastDailyClose = 0.00000123;
    lastDailyCloseDate = "2026-02-03";
  */

  // --- TEMPORÄRER DEMO-WERT ---
  lastDailyClose = 0.00000123;
  lastDailyCloseDate = today;
}

/* =====================================================
   INVESTMENT START
===================================================== */

amountButtons.forEach(btn => {
  btn.addEventListener("click", async () => {

    const amount = Number(btn.dataset.amount);
    if (!amount) return;

    // Kurs laden (falls noch nicht vorhanden)
    if (!lastDailyClose) {
      await loadLatestDailyClose();
    }

    // Wenn immer noch kein Schlusskurs da ist → warten
    if (!lastDailyClose || !lastDailyCloseDate) {
      startStatus.textContent =
        "Noch kein Tages-Schlusskurs verfügbar";
      return;
    }

    // Einstieg nur EINMAL setzen
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
    }

    updateResult();
    updateChart();
  });
});

/* =====================================================
   ANZEIGE
===================================================== */

function updateResult() {
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
   CHART (erst ab 2 Schlusskursen)
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

});
