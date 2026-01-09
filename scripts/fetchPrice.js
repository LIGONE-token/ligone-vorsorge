const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().slice(0, 10);

async function run() {
  const PAIR_ADDRESS = "0xdaf8744329067b5a2b10a5dfca1c916e099b66d2";

  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/pairs/polygon/${PAIR_ADDRESS}`
  );
  const data = await res.json();

  const priceUsd = Number(data?.pair?.priceUsd);
  if (!priceUsd) {
    throw new Error("Preis konnte nicht geladen werden");
  }

  // konservative USD → EUR Umrechnung
  const EUR_RATE = 0.92;
  const price = priceUsd * EUR_RATE;

  const { data: existing } = await supabase
    .from("ligone_prices")
    .select("date")
    .eq("date", today)
    .maybeSingle();

  if (existing) {
    console.log("Preis für heute existiert bereits");
    return;
  }

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
