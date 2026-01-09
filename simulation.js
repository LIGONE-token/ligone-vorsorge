document.addEventListener("DOMContentLoaded", () => {

<script>
/* =====================================================
   LIGONE – Simulation (Basis-Logik)
   Kein Forecast | Keine Anlageberatung
===================================================== */

/* ====== DEMO / PLATZHALTER KURSDATEN ======
   Struktur: [{ date: "YYYY-MM-DD", price: number }]
   → später problemlos durch API ersetzen
*/
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

/* ====== LOGIK ====== */
amountButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const amount = Number(btn.dataset.amount);
    if (!amount || priceHistory.length < 2) return;

    // Erstes & letztes Kursdatum
    const buyPoint = priceHistory[0];
    const currentPoint = priceHistory[priceHistory.length - 1];

    const tokens = amount / buyPoint.price;
    const currentValue = tokens * currentPoint.price;
    const changePct = ((currentValue - amount) / amount) * 100;

    // Anzeige füllen
    $("res-amount").textContent = formatEUR(amount);
    $("res-date").textContent = buyPoint.date;
    $("res-buy-price").textContent = formatPrice(buyPoint.price);
    $("res-current-price").textContent = formatPrice(currentPoint.price);
    $("res-value").textContent = formatEUR(currentValue);
    $("res-change").textContent =
      (changePct >= 0 ? "+" : "") + changePct.toFixed(2).replace(".", ",") + " %";

    // Sektionen sichtbar machen
    resultSection.hidden = false;
    chartSection.hidden = false;

    // Chart zeichnen
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
        label: "Wert der Investition (€)",
        data: values,
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
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
</script>
});
