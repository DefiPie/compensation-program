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
    let ETHUSDPriceFeed;

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
    }

    // Compensation
    await hre.run("verify:verify", {
        address: '0xf59e7fF65f5A3b1AF5009D5F95777189712018C9',
        constructorArguments: [
            compensation_stableCoin,
            compensation_startTimestamp,
            compensation_endTimestamp,
            controller,
            rewardApy,
            lastApyTimestamp
        ],
    });

    // Convert
    // await hre.run("verify:verify", {
    //     address: '0xAAeE36e885302784E4BcF268D3Da1bfE4ab7607E',
    //     constructorArguments: [
    //         convert_pTokenFrom,
    //         convert_tokenTo,
    //         convert_startTimestamp,
    //         convert_endTimestamp,
    //         controller,
    //         reservoir
    //     ],
    // });

    // Refund
    await hre.run("verify:verify", {
        address: '0x42EFFb0C735006F04f4C0648a377ECf23e9BA2Dd',
        constructorArguments: [
            refund_startTimestamp,
            refund_endTimestamp,
            controller,
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
