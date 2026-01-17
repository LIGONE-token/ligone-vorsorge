import { ethers } from "ethers";
import fs from "fs";

console.log("🚨 REBUILD BUY-PRICE (EXACT UNISWAP POOL)", new Date().toISOString());

// RPC (Polygon)
const provider = new ethers.JsonRpcProvider("https://polygon.llamarpc.com");


// 🔒 DEIN UNISWAP V3 POOL (FIX)
const POOL = "0x358404f64dbfe2e63f76d7a66b11be7de11061a2";

// Token-Adressen (lowercase)
const WPOL = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
const LIG1 = "0x92b3677ae2ea7c19aa4fa56936d11be99bcac37d";

// Minimal-ABI für Uniswap V3 Pool
const POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96,int24 tick,uint16 observationIndex,uint16 observationCardinality,uint16 observationCardinalityNext,uint8 feeProtocol,bool unlocked)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

(async () => {
  const pool = new ethers.Contract(POOL, POOL_ABI, provider);

  // Pool-Daten
  const slot0 = await pool.slot0();
const token0 = await pool.token0();
const token1 = await pool.token1();


  const sqrtPriceX96 = slot0.sqrtPriceX96;

  // Preisberechnung aus sqrtPriceX96
  // price = (sqrtPriceX96^2) / 2^192
  const priceX192 = sqrtPriceX96 * sqrtPriceX96;
  const Q192 = 2n ** 192n;

  let priceToken1PerToken0 = Number(priceX192) / Number(Q192);

  // Wir wollen: Preis von LIG1 in POL
  let priceLigInPol;

  if (token0.toLowerCase() === LIG1) {
    // price = token1 (POL) pro 1 token0 (LIG1)
    priceLigInPol = priceToken1PerToken0;
  } else if (token1.toLowerCase() === LIG1) {
    // invertieren
    priceLigInPol = 1 / priceToken1PerToken0;
  } else {
    throw new Error("LIG1 ist nicht Teil dieses Pools");
  }

  if (!priceLigInPol || priceLigInPol <= 0) {
    throw new Error("Ungültiger Pool-Preis");
  }

  console.log("✅ LIG1 Preis (POL) aus DEINEM Pool:", priceLigInPol);

  // Optional: POL → EUR (externe Referenz, NICHT Pool!)
  const fxRes = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur",
    { cache: "no-store" }
  );
  const fxData = await fxRes.json();
  const polEur = fxData["polygon-ecosystem-token"]?.eur;

  if (!polEur || polEur <= 0) {
    throw new Error("POL/EUR nicht verfügbar");
  }

  const priceEur = priceLigInPol * polEur;
  const ligPerEuro = Math.floor(1 / priceEur);

  fs.writeFileSync(
    "data/buy-price.json",
    JSON.stringify(
      {
        ligPerEuro,
        price_pol: priceLigInPol,
        price_eur: priceEur,
        pool: POOL,
        fee: 3000,
        source: "UNISWAP V3 POOL (DIRECT)",
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log("✅ WRITE DONE", new Date().toISOString());
})();
