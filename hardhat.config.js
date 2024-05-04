require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaulthost:"localhost",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_TESTNET_RPC_URL,
      accounts: [process.env.ALCHEMY_TESTNET_PRIVATE_KEY],
    },
    localhost: {
      url: process.env.TESTNET_RPC_URL_LOCAL,
      accounts: [process.env.TESTNET_PRIVATE_KEY_LOCAL]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  }
};
