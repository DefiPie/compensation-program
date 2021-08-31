require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("dotenv/config");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
        },
        mainnet: {
            url: process.env.ETHEREUM_MAINNET_URL,
            chainId: 1,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.ETHEREUM_MAINNET_PRIVATE_KEY}`]
        },
        rinkeby: {
            url: `${process.env.ETHEREUM_RINKEBY_URL}`,
            chainId: 4,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.ETHEREUM_RINKEBY_PRIVATE_KEY}`]
        },
        bscmainnet: {
            url: `${process.env.BSCMAINNET_URL}`,
            chainId: 56,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.BSCMAINNET_PRIVATE_KEY}`]
        },
        bsctestnet: {
            url: `${process.env.BSCTESTNET_URL}`,
            chainId: 97,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.BSCTESTNET_PRIVATE_KEY}`]
        },
        polygon: {
            url: `${process.env.POLYGON_URL}`,
            chainId: 137,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.POLYGON_PRIVATE_KEY}`]
        },
        mumbai: {
            url: `${process.env.MUMBAI_URL}`,
            chainId: 80001,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.MUMBAI_PRIVATE_KEY}`]
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    solidity: {
        compilers: [{
            version: "0.8.4",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }]
    },
    mocha: {
        timeout: 10000
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
};
