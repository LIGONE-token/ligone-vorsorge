const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().slice(0, 10);

async function run() {
  // ✅ DEINE TOKEN-ADRESSE (ohne Klammern, ohne Zusätze)
  const TOKEN_ADDRESS = "0xdaf8744329067b5a2b10a5dfca1c916e099b66d2";

  // ✅ DexScreener TOKEN-Endpoint (richtig!)
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
  );
  const data = await res.json();

  // ✅ Preis aus dem liquidesten Pair
  const priceUsd = Number(data?.pairs?.[0]?.priceUsd);
  if (!priceUsd) {
    throw new Error("Preis konnte nicht geladen werden");
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
