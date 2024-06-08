require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  defaulthost:"localhost",
  settings: {
    optimizer: {
      enabled: true,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  }
};
