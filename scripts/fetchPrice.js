const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().slice(0, 10);

async function run() {
  /* ===============================
     1️⃣ LIVE PREIS AUS DEM PAIR (USD)
     =============================== */

  const PAIR_ADDRESS = "0x9046f148f7dbc35881cddbeeefd56fcff1810445";

  const dexRes = await fetch(
    `https://api.dexscreener.com/latest/dex/pairs/polygon/${PAIR_ADDRESS}`
  );
  if (!dexRes.ok) throw new Error("DexScreener API nicht erreichbar");

  const dexData = await dexRes.json();
  const rawPriceUsd = dexData?.pairs?.[0]?.priceUsd;
const priceUsd = Number(rawPriceUsd);

if (!priceUsd || priceUsd <= 0) {
  console.warn("⚠️ DexScreener liefert keinen LIVE-Preis – letzter Wert bleibt aktiv");
  return; // Workflow NICHT abbrechen!
}


  /* ===============================
     2️⃣ FX: EUR → USD
     =============================== */

  const fxRes = await fetch("https://open.er-api.com/v6/latest/EUR");
  if (!fxRes.ok) throw new Error("FX API nicht erreichbar");

  const fxData = await fxRes.json();
  const eurUsd = Number(fxData?.rates?.USD);
  if (!eurUsd || eurUsd <= 0)
    throw new Error("EUR/USD Kurs ungültig");

  /* ===============================
     3️⃣ BERECHNUNGEN
     =============================== */

  const priceEur = priceUsd / eurUsd;
  const ligPerEuro = Math.floor(1 / priceEur);

  /* ===============================
     4️⃣ LIVE JSON (für Anwendungen)
     =============================== */

  const liveResult = {
    ligPerEuro,
    priceUsd,
    priceEur,
    eurUsd,
    source: "LIVE DexScreener LIG1/WPOL",
    pair: PAIR_ADDRESS,
    updated: new Date().toISOString()
  };

  const jsonPath = path.resolve(__dirname, "../data/buy-price.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(liveResult, null, 2));

  console.log("✅ LIVE Buy-Preis aktualisiert:", ligPerEuro);

  /* ===============================
     5️⃣ TAGESPREIS SPEICHERN (1×)
     =============================== */

  const { data: existing } = await supabase
    .from("ligone_prices")
    .select("date")
    .eq("date", today)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("ligone_prices").insert({
      date: today,
      price_eur: priceEur,
      source: "dexscreener_usd_fx"
    });

    if (error) throw error;
    console.log("📊 Tagespreis gespeichert (EUR):", today, priceEur);
  } else {
    console.log("ℹ️ Tagespreis existiert bereits:", today);
  }
}

run().catch(err => {
  console.error("❌ FEHLER:", err.message);
  process.exit(1);
});
