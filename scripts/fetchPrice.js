const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const today = new Date().toISOString().slice(0, 10);

async function run() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ligone&vs_currencies=eur"
  );

  const data = await res.json();
  const price = Number(data?.ligone?.eur);

  if (!price) {
    throw new Error("Preis konnte nicht geladen werden");
  }

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
    source: "coingecko"
  });

  if (error) throw error;

  console.log("Preis gespeichert:", today, price);
}

run().catch(err => {
  console.error("FEHLER:", err.message);
  process.exit(1);
});
