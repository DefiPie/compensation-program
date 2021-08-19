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

    } else if (network === 'rinkeby') {
        controller = process.env.CONTROLLER_RINKEBY;
        ETHUSDPriceFeed = process.env.PRICEFEED_RINKEBY;

        compensation_stableCoin = process.env.STABLECOIN_RINKEBY;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_RINKEBY;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION_RINKEBY;
        
        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_RINKEBY;
        convert_tokenTo = process.env.TOKENTO_CONVERT_RINKEBY;
        convert_course = process.env.COURSE_CONVERT_RINKEBY;
        convert_startBlock = process.env.START_BLOCK_CONVERT_RINKEBY;
        convert_removeBlocks = process.env.REMOVE_BLOCK__CONVERT_RINKEBY;

        refund_startBlock = process.env.START_BLOCK_REFUND_RINKEBY;
        refund_removeBlocks = process.env.REMOVE_BLOCK_REFUND_RINKEBY;
    } else if (network === 'mainnet') {
        controller = process.env.CONTROLLER_MAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_MAINNET;

        compensation_stableCoin = process.env.STABLECOIN_MAINNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_MAINNET;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION_MAINNET;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_MAINNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_MAINNET;
        convert_course = process.env.COURSE_CONVERT_MAINNET;
        convert_startBlock = process.env.START_BLOCK_CONVERT_MAINNET;
        convert_removeBlocks = process.env.REMOVE_BLOCK__CONVERT_MAINNET;

        refund_startBlock = process.env.START_BLOCK_REFUND_MAINNET;
        refund_removeBlocks = process.env.REMOVE_BLOCK_REFUND_MAINNET;
    } else if (network === 'bsctestnet') {
        controller = process.env.CONTROLLER_BSCTESTNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_BSCTESTNET;

        compensation_stableCoin = process.env.STABLECOIN_BSCTESTNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_BSCTESTNET;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION_BSCTESTNET;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_BSCTESTNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_BSCTESTNET;
        convert_course = process.env.COURSE_CONVERT_BSCTESTNET;
        convert_startBlock = process.env.START_BLOCK_CONVERT_BSCTESTNET;
        convert_removeBlocks = process.env.REMOVE_BLOCK__CONVERT_BSCTESTNET;

        refund_startBlock = process.env.START_BLOCK_REFUND_BSCTESTNET;
        refund_removeBlocks = process.env.REMOVE_BLOCK_REFUND_BSCTESTNET;
    } else if (network === 'bscmainnet') {
        controller = process.env.CONTROLLER_BSCMAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_BSCMAINNET;

        compensation_stableCoin = process.env.STABLECOIN_BSCMAINNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_BSCMAINNET;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION_BSCMAINNET;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_BSCMAINNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_BSCMAINNET;
        convert_course = process.env.COURSE_CONVERT_BSCMAINNET;
        convert_startBlock = process.env.START_BLOCK_CONVERT_BSCMAINNET;
        convert_removeBlocks = process.env.REMOVE_BLOCK__CONVERT_BSCMAINNET;

        refund_startBlock = process.env.START_BLOCK_REFUND_BSCMAINNET;
        refund_removeBlocks = process.env.REMOVE_BLOCK_REFUND_BSCMAINNET;
    } else if (network === 'mumbai') {
        controller = process.env.CONTROLLER_MUMBAI;
        ETHUSDPriceFeed = process.env.PRICEFEED_MUMBAI;

        compensation_stableCoin = process.env.STABLECOIN_MUMBAI;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_MUMBAI;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION_MUMBAI;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_MUMBAI;
        convert_tokenTo = process.env.TOKENTO_CONVERT_MUMBAI;
        convert_course = process.env.COURSE_CONVERT_MUMBAI;
        convert_startBlock = process.env.START_BLOCK_CONVERT_MUMBAI;
        convert_removeBlocks = process.env.REMOVE_BLOCK__CONVERT_MUMBAI;

        refund_startBlock = process.env.START_BLOCK_REFUND_MUMBAI;
        refund_removeBlocks = process.env.REMOVE_BLOCK_REFUND_MUMBAI;
    } else if (network === 'polygon') {
        controller = process.env.CONTROLLER_POLYGON;
        ETHUSDPriceFeed = process.env.PRICEFEED_POLYGON;

        compensation_stableCoin = process.env.STABLECOIN_POLYGON;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_POLYGON;
        compensation_removeBlocks = process.env.REMOVE_BLOCK_COMPENSATION_POLYGON;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_POLYGON;
        convert_tokenTo = process.env.TOKENTO_CONVERT_POLYGON;
        convert_course = process.env.COURSE_CONVERT_POLYGON;
        convert_startBlock = process.env.START_BLOCK_CONVERT_POLYGON;
        convert_removeBlocks = process.env.REMOVE_BLOCK__CONVERT_POLYGON;

        refund_startBlock = process.env.START_BLOCK_REFUND_POLYGON;
        refund_removeBlocks = process.env.REMOVE_BLOCK_REFUND_POLYGON;
    } else {
        console.log("Bad network");
    }

    const compensation = await Compensation.deploy(
        compensation_stableCoin,
        compensation_startBlock,
        compensation_removeBlocks,
        controller,
        ETHUSDPriceFeed,
    );
    console.log("Compensation deployed to:", compensation.address);

    const convert = await Convert.deploy(
        convert_pTokenFrom,
        convert_tokenTo,
        convert_course,
        convert_startBlock,
        convert_removeBlocks,
        controller,
        ETHUSDPriceFeed
    );
    console.log("Convert deployed to:", convert.address);

    const refund = await Refund.deploy(
        refund_startBlock,
        refund_removeBlocks,
        controller,
        ETHUSDPriceFeed
    );
    console.log("Refund deployed to:", refund.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
