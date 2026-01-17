import { ethers } from "ethers";
import fs from "fs";

console.log("🚨 REBUILD BUY-PRICE (UNISWAP ONLY)", new Date().toISOString());

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);

// UNISWAP V2 ROUTER (Polygon) – lowercase, OHNE checksum
const ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";

const WPOL = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
const USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const LIG1 = "0x92b3677ae2ea7c19aa4fa56936d11be99bcac37d";

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

(async () => {
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);

  // 1 POL → USDC
  const onePOL = ethers.parseEther("1");
  const polToUsdc = await router.getAmountsOut(onePOL, [WPOL, USDC]);
  const usdcPerPol = Number(ethers.formatUnits(polToUsdc[1], 6));

  if (!usdcPerPol || usdcPerPol <= 0) {
    throw new Error("UNISWAP: POL/USDC Quote ungültig");
  }

  // 1 € ≈ 1 USDC → POL
  const polForOneEuro = 1 / usdcPerPol;
  const polAmountWei = ethers.parseEther(polForOneEuro.toFixed(18));

  // POL → LIG1
  const polToLig = await router.getAmountsOut(polAmountWei, [WPOL, LIG1]);
  const ligOut = Number(ethers.formatUnits(polToLig[1], 18));

  if (!ligOut || ligOut <= 0) {
    throw new Error("UNISWAP: POL → LIG1 Quote ungültig");
  }

  const ligPerEuro = Math.floor(ligOut);

  fs.writeFileSync(
    "data/buy-price.json",
    JSON.stringify(
      {
        ligPerEuro,
        source: "UNISWAP V2 ROUTER (Polygon)",
        rounding: "floor",
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log("✅ UNISWAP LIG1 pro €:", ligPerEuro);
})();
