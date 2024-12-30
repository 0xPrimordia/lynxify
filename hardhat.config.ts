import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    testnet: {
      url: process.env.TESTNET_ENDPOINT || "https://testnet.hashio.io/api",
      accounts: [
        process.env.OPERATOR_KEY!,
      ],
      chainId: 296
    },
    local: {
      url: process.env.HEDERA_RPC_URL || "http://localhost:7546",
      accounts: [process.env.OPERATOR_KEY || ""],
      chainId: 296
    }
  },
  paths: {
    sources: "./src/app/contracts",
    tests: "./src/tests/hardhat",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config; 