// scripts/fetchPrice.js
// FINAL – Uniswap V3 – Polygon – CRON SAFE

import { ethers } from "ethers";

/* =====================================================
   CONFIG
===================================================== */

// STABILE, ÖFFENTLICHE POLYGON RPCs (KEIN ANKR!)
const RPC_URLS = [
  "https://polygon-rpc.com",
  "https://polygon.llamarpc.com"
];

// Uniswap V3 Factory (Polygon)
const UNISWAP_V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

// TOKEN ADDRESSES
const TOKEN_A = "0x92B3677ae2EA7c19aa4fA56936d11be99BcaC37d"; // LIG1
const TOKEN_B = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // WMATIC

// Uniswap Fee Tier
const FEE = 3000; // 0.3%

// Decimals
const DECIMALS_A = 18;
const DECIMALS_B = 18;

/* =====================================================
   RPC PROVIDER (NO NETWORK DETECTION)
===================================================== */

async function getProvider() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(
        url,
        ethers.Network.from(137), // Polygon
        { staticNetwork: true }
      );

      // kurzer Test (max. 5s)
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, r) => setTimeout(() => r(new Error("RPC timeout")), 5000))
      ]);

      console.log("✅ RPC OK:", url);
      return provider;
    } catch {
      console.warn("⚠️ RPC failed:", url);
    }
  }

  throw new Error("No working RPC");
}

/* =====================================================
   MAIN
===================================================== */

async function main() {
  console.log(
    "🚨 REBUILD BUY-PRICE (EXACT UNISWAP POOL)",
    new Date().toISOString()
  );

  const provider = await getProvider();

  // Uniswap V3 Factory
  const factoryAbi = [
    "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)"
  ];

  const factory = new ethers.Contract(
    UNISWAP_V3_FACTORY,
    factoryAbi,
    provider
  );

  // Token-Sortierung (zwingend!)
  const [token0, token1] =
    TOKEN_A.toLowerCase() < TOKEN_B.toLowerCase()
      ? [TOKEN_A, TOKEN_B]
      : [TOKEN_B, TOKEN_A];

  const poolAddress = await factory.getPool(token0, token1, FEE);

  if (poolAddress === ethers.ZeroAddress) {
    console.log("⚠️ V3 Pool existiert nicht – Abbruch");
    process.exit(0);
  }

  console.log("✅ V3 Pool:", poolAddress);

  // Pool ABI (nur slot0)
  const poolAbi = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)"
  ];

  const pool = new ethers.Contract(poolAddress, poolAbi, provider);

  const slot0 = await pool.slot0();

  // Preisberechnung
  const sqrtPriceX96 = Number(slot0.sqrtPriceX96);
  const priceRaw = (sqrtPriceX96 ** 2) / 2 ** 192;

  const price =
    token0 === TOKEN_A
      ? priceRaw * 10 ** (DECIMALS_A - DECIMALS_B)
      : (1 / priceRaw) * 10 ** (DECIMALS_A - DECIMALS_B);

  console.log("✅ BUY PRICE:", price);

  // SOFORT sauber beenden (CRON SAFE)
  process.exit(0);
}

/* =====================================================
   ERROR HANDLING (CRON DARF NIE FAILEN)
===================================================== */

main().catch(err => {
  console.error("❌ ERROR:", err.message);
  process.exit(0);
});
