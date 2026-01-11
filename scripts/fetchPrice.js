const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().slice(0, 10);

async function run() {
  // ✅ LIG1 / WPOL PAIR-ADRESSE (LIVE-Preis!)
  const PAIR_ADDRESS = "0x9046f148f7dbc35881cddbeeefd56fcff1810445";

  // ✅ DexScreener PAIR-Endpoint (LIVE!)
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/pairs/polygon/${PAIR_ADDRESS}`
  );

  if (!res.ok) {
    throw new Error("DexScreener API nicht erreichbar");
  }

  const data = await res.json();

  // ✅ LIVE-Preis direkt aus dem Pool
  const priceUsd = Number(data?.pairs?.[0]?.priceUsd);

  if (!priceUsd || priceUsd <= 0) {
    throw new Error("LIVE-Preis konnte nicht geladen werden");
  }

  console.log("LIVE priceUsd:", priceUsd);

  // 👉 AB HIER kannst du weiterrechnen:
  // z. B. EUR/USD live holen, JSON schreiben, etc.
}


  // konservative USD → EUR Umrechnung
  const EUR_RATE = 0.92;
  const price = priceUsd * EUR_RATE;

  // prüfen, ob heutiger Preis schon existiert
  const { data: existing } = await supabase
    .from("ligone_prices")
    .select("date")
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    console.log("Preis für heute existiert bereits");
    return;
  }

  // speichern
  const { error } = await supabase.from("ligone_prices").insert({
    date: today,
    price_eur: price,
    source: "dexscreener"
  });

  if (error) throw error;

  console.log("Preis gespeichert:", today, price);
}

run().catch(err => {
  console.error("FEHLER:", err.message);
  process.exit(1);
});
