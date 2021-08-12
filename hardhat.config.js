require("@nomiclabs/hardhat-waffle");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
    networks: {
        hardhat: {
        },
        mainnet: {
            url: `${process.env.ETHEREUM_MAINNET_URL}`,
            chainId: 1,
            gasPrice: `${process.env.ETHEREUM_MAINNET_GAS_PRICE}`,
            accounts: [`0x${process.env.ETHEREUM_MAINNET_PRIVATE_KEY}`]
        },
        rinkeby: {
            url: `${process.env.ETHEREUM_RINKEBY_URL}`,
            chainId: 4,
            gasPrice: `${process.env.ETHEREUM_RINKEBY_GAS_PRICE}`,
            accounts: [`0x${process.env.ETHEREUM_RINKEBY_PRIVATE_KEY}`]
        },
        bscmainnet: {
            url: `${process.env.BSCMAINNET_URL}`,
            chainId: 56,
            gasPrice: `${process.env.BSCMAINET_GAS_PRICE}`,
            accounts: [`0x${process.env.BSCMAINNET_PRIVATE_KEY}`]
        },
        bsctestnet: {
            url: `${process.env.BSCTESTNET_URL}`,
            chainId: 97,
            gasPrice: `${process.env.BSCTESTNET_GAS_PRICE}`,
            accounts: [`0x${process.env.BSCTESTNET_PRIVATE_KEY}`]
        },
        polygon: {
            url: `${process.env.POLYGON_URL}`,
            chainId: 137,
            gasPrice: `${process.env.POLYGON_GAS_PRICE}`,
            accounts: [`0x${process.env.POLYGON_PRIVATE_KEY}`]
        },
        mumbai: {
            url: `${process.env.MUMBAI_URL}`,
            chainId: 80001,
            gasPrice: `${process.env.MUMBAI_GAS_PRICE}`,
            accounts: [`0x${process.env.MUMBAI_PRIVATE_KEY}`]
        }
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
