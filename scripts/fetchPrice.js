import { ethers } from "ethers";
import fs from "fs";

console.log("🚨 REBUILD BUY-PRICE (UNISWAP ONLY)", new Date().toISOString());

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);

// 🔒 UNISWAP V2 ROUTER (Polygon)
const ROUTER = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

// Tokens
const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const LIG1 = "0x92B3677ae2EA7c19aa4fA56936d11be99BcaC37d";

// ABI
const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

(async () => {
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);

  // 1️⃣ POL → USDC (1 POL)
  const onePOL = ethers.parseEther("1");
  const polToUsdc = await router.getAmountsOut(onePOL, [WPOL, USDC]);
  const usdcPerPol = Number(ethers.formatUnits(polToUsdc[1], 6));

  if (!usdcPerPol || usdcPerPol <= 0) {
    throw new Error("UNISWAP: POL/USDC Quote ungültig");
  }

  // 2️⃣ 1 € ≈ 1 USDC ⇒ POL
  const polForOneEuro = 1 / usdcPerPol;
  const polAmountWei = ethers.parseEther(polForOneEuro.toFixed(18));

  // 3️⃣ POL → LIG1 (UNISWAP QUOTE – UI-identisch)
  const polToLig = await router.getAmountsOut(polAmountWei, [WPOL, LIG1]);
  const ligOut = Number(ethers.formatUnits(polToLig[1], 18));

  if (!ligOut || ligOut <= 0) {
    throw new Error("UNISWAP: POL → LIG1 Quote ungültig");
  }

  // 4️⃣ defensiv abrunden
  const ligPerEuro = Math.floor(ligOut);

  fs.writeFileSync(
    "data/buy-price.json",
    JSON.stringify(
      {
        ligPerEuro,
        source: "UNISWAP V2 ROUTER (Polygon)",
        path: "POL → LIG1",
        rounding: "floor (defensiv)",
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log("✅ UNISWAP LIG1 pro €:", ligPerEuro);
})();
