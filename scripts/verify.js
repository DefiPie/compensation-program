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
    let convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_RINKEBY;
    let convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_RINKEBY;
    let refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_RINKEBY;
    let refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_RINKEBY;
    let lastApyTimestamp = process.env.RINKEBY_LAST_APY_TIMESTAMP;
    let calcPoolPrice = process.env.RINKEBY_CALCPOOLPRICE;
    let controller = process.env.CONTROLLER_RINKEBY;
    let ETHUSDPriceFeed = process.env.PRICEFEED_RINKEBY;
    let pETH = process.env.RINKEBY_PETH;
    let reservoir = process.env.RINKEBY_RESERVOIR;
    let compensation_stableCoin = process.env.STABLECOIN_RINKEBY;
    let rewardApy = process.env.REWARD_APY_RINKEBY;
    let convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_RINKEBY;
    let convert_tokenTo = process.env.TOKENTO_CONVERT_RINKEBY;

    // Compensation
    await hre.run("verify:verify", {
        address: '0x09995C68735034C1AB1a3FD961452a3cEfaC6232',
        constructorArguments: [
            compensation_stableCoin,
            compensation_startTimestamp,
            compensation_endTimestamp,
            controller,
            ETHUSDPriceFeed,
            pETH,
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
            ETHUSDPriceFeed,
            pETH,
            reservoir
        ],
    });

    // Refund
    await hre.run("verify:verify", {
        address: '0x59Fce3dA37A888e8500604a1c3021010F9d4496C',
        constructorArguments: [
            refund_startTimestamp,
            refund_endTimestamp,
            controller,
            ETHUSDPriceFeed,
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
