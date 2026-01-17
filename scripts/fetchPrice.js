// scripts/fetchPrice.js
// FINAL – Uniswap V3 – Polygon – CRON SAFE
// ⛔ Harter Not-Aus nach 90 Sekunden
setTimeout(() => {
  console.error("⛔ Global timeout – exiting");
  process.exit(0); // Cron darf nie failen
}, 90_000);

import { ethers } from "ethers";

// ================= CONFIG =================
const RPC_URLS = [
  "https://rpc.ankr.com/polygon",
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com"
];

const UNISWAP_V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

// ⚠️ HIER DEINE TOKEN
const TOKEN_A = "0x92B3677ae2EA7c19aa4fA56936d11be99BcaC37d";   // LIG1
const TOKEN_B = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // WMATIC
const FEE = 3000; // 0.3%

const DECIMALS_A = 18;
const DECIMALS_B = 18;

// =========================================

async function getProvider() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      console.log("✅ RPC OK:", url);
      return provider;
    } catch {
      console.warn("⚠️ RPC failed:", url);
    }
  }
  throw new Error("❌ No working RPC");
}

async function main() {
  console.log("🚨 REBUILD BUY-PRICE (EXACT UNISWAP POOL)", new Date().toISOString());

  const provider = await getProvider();

  const factoryAbi = [
    "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)"
  ];

  const factory = new ethers.Contract(
    UNISWAP_V3_FACTORY,
    factoryAbi,
    provider
  );

  // SORTIERUNG IST ZWINGEND
  const [token0, token1] =
    TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase()
      ? [TOKEN_A, TOKEN_B]
      : [TOKEN_B, TOKEN_A];

  const poolAddress = await factory.getPool(token0, token1, FEE);

  if (poolAddress === ethers.ZeroAddress) {
    console.log("⚠️ Pool existiert nicht – Abbruch ohne Fehler");
    return;
  }

  console.log("✅ V3 Pool:", poolAddress);

  const poolAbi = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)"
  ];

  const pool = new ethers.Contract(poolAddress, poolAbi, provider);

  let slot0;
  try {
    slot0 = await pool.slot0();
  } catch {
    console.log("⚠️ Pool nicht initialisiert – Abbruch ohne Crash");
    return;
  }

  const sqrtPriceX96 = Number(slot0.sqrtPriceX96);
  const priceRaw = (sqrtPriceX96 ** 2) / 2 ** 192;

  const price =
    token0 === TOKEN_A
      ? priceRaw * 10 ** (DECIMALS_A - DECIMALS_B)
      : (1 / priceRaw) * 10 ** (DECIMALS_A - DECIMALS_B);

  console.log("✅ BUY PRICE:", price);
}

main().catch(err => {
  console.error("❌ UNEXPECTED ERROR:", err.message);
  process.exit(0); // CRON DARF NIE FAILEN
});
