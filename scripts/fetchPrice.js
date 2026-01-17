import { ethers } from "ethers";
import fs from "fs";

console.log("🚨 REBUILD BUY-PRICE", new Date().toISOString());

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);

// QuickSwap Factory & Tokens
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

// ---------- Pool holen ----------
const factory = new ethers.Contract(FACTORY, factoryAbi, provider);
const pairAddress = await factory.getPair(WPOL, LIG1);

if (pairAddress === ethers.ZeroAddress) {
  throw new Error("⛔ Kein POL/LIG1 Pool vorhanden");
}

const pair = new ethers.Contract(pairAddress, pairAbi, provider);
const [r0, r1] = await pair.getReserves();
const token0 = await pair.token0();

// ---------- Preis LIG1 in POL ----------
let pricePOL;

if (token0.toLowerCase() === WPOL.toLowerCase()) {
  // r0 = POL, r1 = LIG1
  pricePOL = Number(r0) / Number(r1);
} else {
  // r1 = POL, r0 = LIG1
  pricePOL = Number(r1) / Number(r0);
}

if (!pricePOL || pricePOL <= 0) {
  throw new Error("POL-Preis ungültig");
}

console.log("✅ LIG1 Preis (POL):", pricePOL);

// ---------- POL → EUR ----------
const fxRes = await fetch(
  "https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur",
  { cache: "no-store" }
);

const fxData = await fxRes.json();
const polEur = fxData["polygon-ecosystem-token"]?.eur;

if (!polEur || polEur <= 0) {
  throw new Error("POL/EUR Preis nicht verfügbar");
}

// ---------- Ergebnis ----------
const priceEUR = pricePOL * polEur;
const ligPerEuro = Math.floor(1 / priceEUR);

fs.writeFileSync(
  "data/buy-price.json",
  JSON.stringify(
    {
      ligPerEuro,
      price_eur: priceEUR,
      source: "QuickSwap POL/LIG1 + CoinGecko POL/EUR",
      updatedAt: new Date().toISOString()
    },
    null,
    2
  )
);

console.log("✅ WRITE DONE", new Date().toISOString());
