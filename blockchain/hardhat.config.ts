import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

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

    amoy: {
      type: "http",
      chainType: "l1",
      url: process.env.AMOY_RPC_URL!,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
});