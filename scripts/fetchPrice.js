console.log("🚨 REBUILD BUY-PRICE", new Date().toISOString());

import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);

// QuickSwap Factory & Pair
const FACTORY = "0x9e5A52f57b3038F1B8EeE45F28b3C1967e22799C";
const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const LIG1 = "0x92B3677ae2EA7c19aa4fA56936d11be99BcaC37d";

const factoryAbi = [
  "function getPair(address,address) external view returns (address)"
];

const pairAbi = [
  "function getReserves() view returns (uint112,uint112,uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

const factory = new ethers.Contract(FACTORY, factoryAbi, provider);

const pairAddress = await factory.getPair(WPOL, LIG1);

if (pairAddress === ethers.ZeroAddress) {
  console.log("⛔ Kein Pool vorhanden");
  process.exit(0);
}

const pair = new ethers.Contract(pairAddress, pairAbi, provider);

const [r0, r1] = await pair.getReserves();
const token0 = await pair.token0();

let price;

if (token0.toLowerCase() === WPOL.toLowerCase()) {
  price = Number(r0) / Number(r1);
} else {
  price = Number(r1) / Number(r0);
}

// Preis pro 1 LIG1 in POL (aus Pool / Quote)
const pricePOL = priceInPOL;

console.log("✅ LIGONE Preis (POL):", pricePOL);

// =========================
// POL → EUR holen
// =========================
const fxRes = await fetch(
  "https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur",
  { cache: "no-store" }
);

const fxData = await fxRes.json();
const polEur = fxData["polygon-ecosystem-token"]?.eur;

if (!polEur || polEur <= 0) {
  throw new Error("POL/EUR Preis nicht verfügbar");
}

// Preis pro LIG1 in EUR
const priceEUR = pricePOL * polEur;

// LIG1 pro 1 €
const ligPerEuro = 1 / priceEUR;


fs.writeFileSync(
  "data/buy-price.json",
  JSON.stringify({
    price_pol: pricePOL,
    price_eur: priceEUR,
    ligPerEuro,
    updated: new Date().toISOString()
  }, null, 2)
);
console.log("🚨 WRITE DONE", new Date().toISOString());

