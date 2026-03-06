import fetch from "node-fetch";

const LIG1_ADDRESS = "0x92B3677ae2EA7c19aa4fA56936d11be99BcaC37d";
const POL_ADDRESS = "0x0000000000000000000000000000000000001010"; // Polygon POL

async function getPrice() {

  // Poolpreis von Uniswap / Dex API
  const dex = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${LIG1_ADDRESS}`
  ).then(r => r.json());

  const pair = dex.pairs.find(p => p.chainId === "polygon");

  const pricePOL = Number(pair.priceNative);

  // POL Preis in €
  const cg = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=eur"
  ).then(r => r.json());

  const polEur = cg["polygon-ecosystem-token"].eur;

  const priceEur = pricePOL * polEur;
  const ligPerEuro = 1 / priceEur;

  const result = {
    ligPerEuro: Math.round(ligPerEuro),
    price_eur: priceEur,
    source: "Uniswap POL/LIG1 + CoinGecko POL/EUR",
    updatedAt: new Date().toISOString()
  };

  console.log(JSON.stringify(result, null, 2));
}

getPrice();
