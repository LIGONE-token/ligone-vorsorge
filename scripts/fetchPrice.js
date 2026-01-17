import { ethers } from "ethers";
import fs from "fs";

// ================= RPC FALLBACK =================
const RPC_URLS = [
  "https://rpc.ankr.com/polygon",
  "https://polygon-rpc.com",
  "https://rpc-mainnet.maticvigil.com"
];

async function getProvider() {
  for (const url of RPC_URLS) {
    try {
      const p = new ethers.JsonRpcProvider(url);
      await p.getBlockNumber();
      console.log("✅ RPC OK:", url);
      return p;
    } catch {
      console.warn("⚠️ RPC failed:", url);
    }
  }
  throw new Error("Kein funktionierender Polygon RPC erreichbar");
}

// ================= MAIN =================
(async () => {
  console.log(
    "🚨 REBUILD BUY-PRICE (EXACT UNISWAP POOL)",
    new Date().toISOString()
  );

  // 🔴 provider EXISTIERT NUR HIER
  const provider = await getProvider();

  // ======= DEIN POOL =======
  const POOL = "0x358404f64dbfe2e63f76d7a66b11be7de11061a2";
  const LIG1 = "0x92b3677ae2ea7c19aa4fa56936d11be99bcac37d";

  const POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ];

  // 🔴 HIER wird provider verwendet – gleicher Scope
  const pool = new ethers.Contract(POOL, POOL_ABI, provider);

  const slot0 = await pool.slot0();
  const token0 = (await pool.token0()).toLowerCase();
  const token1 = (await pool.token1()).toLowerCase();

  const sqrtPriceX96 = slot0.sqrtPriceX96;
  const priceX192 = sqrtPriceX96 * sqrtPriceX96;
  const Q192 = 2n ** 192n;
  const rawPrice = Number(priceX192) / Number(Q192);

  const priceLigInPol =
    token0 === LIG1 ? rawPrice : 1 / rawPrice;

  console.log("✅ LIG1 Preis (POL):", priceLigInPol);

  fs.writeFileSync(
    "data/buy-price.json",
    JSON.stringify(
      {
        price_pol: priceLigInPol,
        pool: POOL,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log("✅ WRITE DONE");
})();
