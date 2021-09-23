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

    // Token
    // let amount = '100000000000000000000'; // 100e18
    // await hre.run("verify:verify", {
    //     address: '0x6958324BA1C516f226c1677AeFCd9D1BCd28E3A5',
    //     constructorArguments: [
    //         amount,
    //         "New Token Test",
    //         "NTT"
    //     ],
    // });


    // Compensation
    await hre.run("verify:verify", {
        address: '0xa55b29eCBF25e8373147633E9a4786340550CcBb',
        constructorArguments: [
            "0x1834002dba23c27fe9acd947bdb229c699cc012c",
            1632411600, // START_TIMESTAMP
            1632415800, // END_TIMESTAMP
            "0xd204be259f703503ef2ea03eb401ce6e07254d96",
            "0x8a753747a1fa494ec906ce90e9f37563a8af630e",
            "250000000000000000",
            1632415200 // LAST_APY_TIMESTAMP
        ],
    });

    // Convert
    await hre.run("verify:verify", {
        address: '0x3B4dF7B8557618c99Ed9A52B7dA6ddf4D1346E10',
        constructorArguments: [
            "0x82aa580e4dDE8e750363962d057feA6FFb138b57",
            "0xCA03cEd418ECC76191FE2E86f0ffe6dD94d9Fa33",
            1632411600, // START_TIMESTAMP
            1632415800, // END_TIMESTAMP
            "0xd204be259f703503ef2ea03eb401ce6e07254d96",
            "0x8a753747a1fa494ec906ce90e9f37563a8af630e",
            "0x32b230795AB78AB51EA7b3F15a23a762aaECd3e0"
        ],
    });

    // Refund
    await hre.run("verify:verify", {
        address: '0x84ef6aC2b2056BdD493702f2D8fe64392449dCbE',
        constructorArguments: [
            1632411600, // START_TIMESTAMP
            1632415800, // END_TIMESTAMP
            "0xd204be259f703503ef2ea03eb401ce6e07254d96",
            "0x8a753747a1fa494ec906ce90e9f37563a8af630e"
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
