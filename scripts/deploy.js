// npx hardhat run --network rinkeby scripts/deploy.js
// npx hardhat verify --network rinkeby 0xC30b2CDC93d72a45B63472FFB095928a5A9Ab8f0 "0xC30b2CDC93d72a45B63472FFB095928a5A9Ab8f0"

const hre = require("hardhat");
const network = hre.network.name;
const dotenv = require('dotenv');
const fs = require('fs');
const envConfig = dotenv.parse(fs.readFileSync(`.env`));
for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

async function main() {
    const Compensation = await hre.ethers.getContractFactory("Compensation");
    const Convert = await hre.ethers.getContractFactory("Convert");
    const Refund = await hre.ethers.getContractFactory("Refund");

    let controller;
    let ETHUSDPriceFeed;

    // compensation
    let compensation_stableCoin;
    let compensation_startBlock;
    let compensation_removeBlocks;

    // convert
    let convert_pTokenFrom;
    let convert_tokenTo;
    let convert_course;
    let convert_startBlock;
    let convert_removeBlocks;

    // refund
    let refund_startBlock;
    let refund_removeBlocks;

    if (network === 'hardhat') {

    } else if (network === 'mainnet') {
        controller = process.env.CONTROLLER_MAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_MAINNET;

        compensation_stableCoin = process.env.STABLECOIN_MAINNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION;

        const compensation = await Compensation.deploy(
            compensation_stableCoin,
            compensation_startBlock,
            compensation_removeBlocks,
            controller,
            ETHUSDPriceFeed,
        );
        console.log("Compensation deployed to:", compensation.address);

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT;
        convert_tokenTo = process.env.TOKENTO_CONVERT;
        convert_course = process.env.COURSE_CONVERT;
        compensation_startBlock = process.env.START_BLOCK_CONVERT;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_CONVERT;

        const convert = await Convert.deploy(
            convert_pTokenFrom,
            convert_tokenTo,
            convert_course,
            compensation_startBlock,
            compensation_removeBlocks,
            controller,
            ETHUSDPriceFeed
        );
        console.log("Convert deployed to:", convert.address);

        compensation_startBlock = process.env.START_BLOCK_REFUND;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_REFUND;

        const refund = await Refund.deploy(
            compensation_startBlock,
            compensation_removeBlocks,
            controller,
            ETHUSDPriceFeed
        );
        console.log("Refund deployed to:", refund.address);

    } else {
        console.log("Bad network");
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
