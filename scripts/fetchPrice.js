import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);

// QuickSwap Factory & Pair
const FACTORY = "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32";
const WPOL = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const LIG1 = "0xDaf8744329067B5a2b10A5DFca1c916E099b66d2";

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

console.log("✅ LIGONE Preis (POL):", price);
