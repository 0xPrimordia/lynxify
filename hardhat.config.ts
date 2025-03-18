require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: '.env.local' });

const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    testnet: {
      url: process.env.TESTNET_ENDPOINT || "https://testnet.hashio.io/api",
      accounts: [
        process.env.OPERATOR_KEY,
      ],
      chainId: 296
    },
    local: {
      url: process.env.HEDERA_RPC_URL || "http://localhost:7546",
      accounts: [process.env.OPERATOR_KEY || ""],
      chainId: 296
    },
    hardhat: {
      chainId: 296,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        accountsBalance: "10000000000000000000000"
      }
    }
  },
  paths: {
    sources: "./src/app/contracts",
    tests: "./src/tests/hardhat",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

module.exports = config; 