import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import * as path from "path";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the monorepo root .env (one level above blockchain/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
// Also load a local blockchain/.env if present
dotenv.config({ path: path.resolve(__dirname, ".env") });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const AMOY_RPC_URL = process.env.AMOY_RPC_URL;

export default defineConfig({
  solidity: "0.8.28",

  plugins: [
    hardhatEthers,
  ],

  networks: {
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },

    // Amoy testnet — only included when env vars are real (non-localhost) values
    ...(PRIVATE_KEY && AMOY_RPC_URL && !AMOY_RPC_URL.includes("127.0.0.1")
      ? {
          amoy: {
            type: "http" as const,
            chainType: "l1" as const,
            url: AMOY_RPC_URL,
            accounts: [PRIVATE_KEY],
          },
        }
      : {}),
  },
});