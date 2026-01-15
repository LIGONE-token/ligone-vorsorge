import { ethers } from "ethers";
import fs from "fs";

// ================== KONFIG ==================
const RPC_URL = "https://polygon-rpc.com";

// Uniswap / Quickswap Router (Polygon, V2-kompatibel)
const ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";

// Token-Adressen
const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // intern für POL
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const LIG1 = "0xdaf8744329067b5a2b10a5dfca1c916e099b66d2";

// Sicherheitsfaktor: wir rechnen mit 1.02 €, runden dann runter
const EURO_VALUE = 1.0;


// ================== ABI ==================
const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

// ================== SCRIPT ==================
(async () => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const router = new ethers.Contract(ROUTER, ROUTER_ABI, provider);

  // 1️⃣ POL/USDC → wie viel USDC für 1 POL?
  const onePOL = ethers.parseEther("1");
  const polToUsdc = await router.getAmountsOut(onePOL, [WPOL, USDC]);
  const usdcPerPol = Number(ethers.formatUnits(polToUsdc[1], 6));

  if (!usdcPerPol || usdcPerPol <= 0) {
    throw new Error("POL/USDC Preis ungültig");
  }

  // 2️⃣ 1 € ⇒ POL (USDC ≈ €)
  const polForOneEuro = EURO_VALUE / usdcPerPol;

  const polAmountWei = ethers.parseEther(
  polForOneEuro.toFixed(18)
);


  // 3️⃣ POL → LIG1 (echter Swap-Quote)
  const polToLig = await router.getAmountsOut(polAmountWei, [WPOL, LIG1]);
  const ligOut = Number(ethers.formatUnits(polToLig[1], 18));

  if (!ligOut || ligOut <= 0) {
    throw new Error("POL → LIG1 Quote ungültig");
  }

  // 4️⃣ defensiv abrunden
  const ligPerEuro = Math.floor(ligOut);

  // 5️⃣ JSON schreiben
  const result = {
    ligPerEuro,
    input: "1 EUR ≈ POL (via POL/USDC)",
    router: "Uniswap V2 (Polygon)",
    rounding: "floor (defensiv)",
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "data/buy-price.json",
    JSON.stringify(result, null, 2)
  );

  console.log("✅ LIG1 Buy-Preis aktualisiert:", ligPerEuro);
})();
