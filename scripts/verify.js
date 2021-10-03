// npx hardhat run --network rinkeby scripts/verify.js

const hre = require("hardhat");
const network = hre.network.name;
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

    let controller;
    let pETH;

    // compensation
    let compensation_stableCoin;
    let compensation_startTimestamp;
    let compensation_endTimestamp;
    let rewardApy;
    let lastApyTimestamp;

    // convert
    let convert_pTokenFrom;
    let convert_tokenTo;
    let convert_startTimestamp;
    let convert_endTimestamp;
    let reservoir;

    // refund
    let refund_startTimestamp;
    let refund_endTimestamp;
    let calcPoolPrice;

    if (network === 'rinkeby') {
        controller = process.env.CONTROLLER_RINKEBY;
        pETH = process.env.RINKEBY_PETH;

        compensation_stableCoin = process.env.STABLECOIN_RINKEBY;
        compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_RINKEBY;
        compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_RINKEBY;
        rewardApy = process.env.REWARD_APY_RINKEBY;
        lastApyTimestamp = process.env.RINKEBY_LAST_APY_TIMESTAMP;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_RINKEBY;
        convert_tokenTo = process.env.TOKENTO_CONVERT_RINKEBY;
        convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_RINKEBY;
        convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_RINKEBY;
        reservoir = process.env.RINKEBY_RESERVOIR;

        refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_RINKEBY;
        refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_RINKEBY;
        calcPoolPrice = process.env.RINKEBY_CALCPOOLPRICE;
    } else if (network === 'bscmainnet') {
        controller = process.env.CONTROLLER_BSCMAINNET;
        pETH = process.env.BSCMAINNET_PETH;

        compensation_stableCoin = process.env.STABLECOIN_BSCMAINNET;
        compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_BSCMAINNET;
        compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_BSCMAINNET;
        rewardApy = process.env.REWARD_APY_BSCMAINNET;
        lastApyTimestamp = process.env.BSCMAINNET_LAST_APY_TIMESTAMP;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_BSCMAINNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_BSCMAINNET;
        convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_BSCMAINNET;
        convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_BSCMAINNET;
        reservoir = process.env.BSCMAINNET_RESERVOIR;

        refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_BSCMAINNET;
        refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_BSCMAINNET;
        calcPoolPrice = process.env.BSCMAINNET_CALCPOOLPRICE;
    } else if (network === 'mainnet') {
        controller = process.env.CONTROLLER_MAINNET;
        pETH = process.env.MAINNET_PETH;

        compensation_stableCoin = process.env.STABLECOIN_MAINNET;
        compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_MAINNET;
        compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_MAINNET;
        rewardApy = process.env.REWARD_APY_MAINNET;
        lastApyTimestamp = process.env.MAINNET_LAST_APY_TIMESTAMP;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_MAINNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_MAINNET;
        convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_MAINNET;
        convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_MAINNET;
        reservoir = process.env.MAINNET_RESERVOIR;

        refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_MAINNET;
        refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_MAINNET;
        calcPoolPrice = process.env.MAINNET_CALCPOOLPRICE;
    }

    // Compensation
    await hre.run("verify:verify", {
        address: '0x454C241785013231fB0C4970E3A4E4c6Bf9B67D1',
        constructorArguments: [
            compensation_stableCoin,
            compensation_startTimestamp,
            rewardApy,
            lastApyTimestamp
        ],
    });

    // Convert
    await hre.run("verify:verify", {
        address: '0xAAeE36e885302784E4BcF268D3Da1bfE4ab7607E',
        constructorArguments: [
            convert_pTokenFrom,
            convert_tokenTo,
            convert_startTimestamp,
            convert_endTimestamp,
            controller,
            pETH,
            reservoir
        ],
    });

    // Refund
    await hre.run("verify:verify", {
        address: '0x3Bf5306c9059e75227BBFA7d54E05c61166889f8',
        constructorArguments: [
            refund_startTimestamp,
            controller,
            pETH,
            calcPoolPrice
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
