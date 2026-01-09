document.addEventListener("DOMContentLoaded", () => {

/* =====================================================
   LIGONE – Simulation (Basis-Logik)
===================================================== */

/* ====== TEST-KURSDATEN ====== */
const priceHistory = [
  { date: "2025-12-01", price: 0.00000110 },
  { date: "2025-12-10", price: 0.00000118 },
  { date: "2025-12-20", price: 0.00000115 },
  { date: "2025-12-31", price: 0.00000122 },
  { date: "2026-01-05", price: 0.00000128 }
];

/* ====== HELPERS ====== */
const $ = id => document.getElementById(id);

function formatEUR(v) {
  return Number(v).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " €";
}

function formatPrice(v) {
  return v.toLocaleString("de-DE", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  });
}

/* ====== ELEMENTE ====== */
const amountButtons = document.querySelectorAll(".amount-buttons button");
const resultSection = document.querySelector(".simulation-result");
const chartSection  = document.querySelector(".simulation-chart");

/* ====== SICHERHEIT ====== */
if (!amountButtons.length) {
  console.error("❌ Keine Betrag-Buttons gefunden");
  return;
}

/* ====== LOGIK ====== */
amountButtons.forEach(btn => {
  btn.addEventListener("click", () => {

    const amount = Number(btn.dataset.amount);
    if (!amount) return;

    const buy = priceHistory[0];
    const now = priceHistory[priceHistory.length - 1];

    const tokens = amount / buy.price;
    const value = tokens * now.price;
    const change = ((value - amount) / amount) * 100;

    $("res-amount").textContent = formatEUR(amount);
    $("res-date").textContent = buy.date;
    $("res-buy-price").textContent = formatPrice(buy.price);
    $("res-current-price").textContent = formatPrice(now.price);
    $("res-value").textContent = formatEUR(value);
    $("res-change").textContent =
      (change >= 0 ? "+" : "") + change.toFixed(2).replace(".", ",") + " %";

    resultSection.hidden = false;
    chartSection.hidden = false;

    drawChart(amount);
  });
});

/* ====== CHART ====== */
let chart;

function drawChart(amount) {
  const ctx = document.getElementById("investmentChart").getContext("2d");

  const labels = priceHistory.map(p => p.date);
  const values = priceHistory.map(p => (amount / priceHistory[0].price) * p.price);

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
      plugins: { legend: { display: false } },
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
