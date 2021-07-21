import { task } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-web3-legacy";
import "hardhat-contract-sizer";
require("dotenv").config();
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    bsctestnet: {
      url: process.env.BSCTESTNET_NETWORK_URL,
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [process.env.BSCTESTNET_PRIVATE_KEY],
    },
    bscmainnet: {
      url: process.env.BSCMAINNET_NETWORK_URL,
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [process.env.BSCMAINNET_PRIVATE_KEY],
    },

  },
  etherscan: {
    apiKey: process.env.BSCTESTNET_ETHERSCAN_KEY,
  },
  settings: {
    optimizer: {
        enabled: true,
        runs: 10000,
      },
  },
  solidity: "0.8.4",
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
};
