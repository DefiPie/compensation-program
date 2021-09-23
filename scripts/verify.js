// npx hardhat run --network rinkeby scripts/deploy_erc20.js
// npx hardhat verify --network rinkeby 0xC30b2CDC93d72a45B63472FFB095928a5A9Ab8f0 "0xC30b2CDC93d72a45B63472FFB095928a5A9Ab8f0"

const hre = require("hardhat");
const dotenv = require('dotenv');
const fs = require('fs');
const envConfig = dotenv.parse(fs.readFileSync(`.env`));
for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

async function main() {
    let amount = '100000000000000000000'; // 100e18

    await hre.run("verify:verify", {
        address: '0x68A6090763cbC937f478c68971134ba31462a2e3',
        constructorArguments: [
            amount,
            "New Token Test",
            "NTT"
        ],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
