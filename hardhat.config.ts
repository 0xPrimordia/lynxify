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
  networks: {
    hardhat: {
      chainId: 296,
      accounts: [
        {
          privateKey: "0123456789012345678901234567890123456789012345678901234567890123",
          balance: "10000000000000000000000"
        }
      ]
    }
  },
  paths: {
    sources: "./src/app/contracts",
    tests: "./src/tests",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

module.exports = config; 