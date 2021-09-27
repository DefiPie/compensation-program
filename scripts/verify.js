// npx hardhat run --network rinkeby scripts/verify.js

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

    let compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_RINKEBY;
    let compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_RINKEBY;
    let lastApyTimestamp = process.env.RINKEBY_LAST_APY_TIMESTAMP;

    // Compensation
    await hre.run("verify:verify", {
        address: '0x14afac35F561121CDCE3719BC6A6F1f5bd7304f3',
        constructorArguments: [
            "0x1834002dba23c27fe9acd947bdb229c699cc012c",
            compensation_startTimestamp,
            compensation_endTimestamp,
            "0xd204be259f703503ef2ea03eb401ce6e07254d96",
            "0x8a753747a1fa494ec906ce90e9f37563a8af630e",
            "250000000000000000",
            lastApyTimestamp
        ],
    });

    // Convert
    await hre.run("verify:verify", {
        address: '0xd4897b75aCB0211582E276502fCb7a3cb4099C3B',
        constructorArguments: [
            "0x82aa580e4dDE8e750363962d057feA6FFb138b57",
            "0xCA03cEd418ECC76191FE2E86f0ffe6dD94d9Fa33",
            compensation_startTimestamp,
            compensation_endTimestamp,
            "0xd204be259f703503ef2ea03eb401ce6e07254d96",
            "0x8a753747a1fa494ec906ce90e9f37563a8af630e",
            "0x32b230795AB78AB51EA7b3F15a23a762aaECd3e0"
        ],
    });

    // Refund
    await hre.run("verify:verify", {
        address: '0xd92534f16E02eaCc5E4057AE8496F1EC853A2337',
        constructorArguments: [
            compensation_startTimestamp,
            compensation_endTimestamp,
            "0xd204be259f703503ef2ea03eb401ce6e07254d96",
            "0x8a753747a1fa494ec906ce90e9f37563a8af630e",
            "0x394b8B1a2C65b08f0b1FbeB2b20fCe4De7213fc9"
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
