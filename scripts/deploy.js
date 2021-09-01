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
    let compensation_endBlock;
    let rewardApy;

    // convert
    let convert_pTokenFrom;
    let convert_tokenTo;
    let convert_course;
    let convert_startBlock;
    let convert_endBlock;

    // refund
    let refund_startBlock;
    let refund_endBlock;

    if (network === 'hardhat') {
        const Mock = await hre.ethers.getContractFactory("Mock");
        const mock = await Mock.deploy();
        console.log("Mock deployed to:", mock.address);

        controller = mock.address;
        ETHUSDPriceFeed = mock.address;

        const ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        let amount = '100000000000000000000';
        const stable = await ERC20Token.deploy(
            amount,
            'USDT',
            'USDT'
        );
        console.log("Stable deployed to:", stable.address);

        rewardApy = '250000000000000000'; // 25% - 25e16

        compensation_stableCoin = stable.address;
        compensation_startBlock = '10';
        compensation_endBlock = '100';

        amount = '100000000000000000000';
        const pToken = await ERC20Token.deploy(
            amount,
            'pToken1',
            'pToken1'
        );
        console.log("PToken deployed to:", pToken.address);

        convert_pTokenFrom = pToken.address;

        amount = '100000000000000000000';
        const tokenTo = await ERC20Token.deploy(
            amount,
            'tokenTo',
            'tokenTo'
        );
        console.log("TokenTo deployed to:", tokenTo.address);

        convert_tokenTo = tokenTo.address;
        convert_course = '20000000000000000'; // 0.02e18

        convert_startBlock = '10';
        convert_endBlock = '100';

        refund_startBlock = '10';
        refund_endBlock = '100';

    } else if (network === 'rinkeby') {
        controller = process.env.CONTROLLER_RINKEBY;
        ETHUSDPriceFeed = process.env.PRICEFEED_RINKEBY;

        compensation_stableCoin = process.env.STABLECOIN_RINKEBY;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_RINKEBY;
        compensation_endBlock = process.env.END_BLOCK_COMPENSATION_RINKEBY;
        rewardApy = process.env.REWARD_APY_RINKEBY;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_RINKEBY;
        convert_tokenTo = process.env.TOKENTO_CONVERT_RINKEBY;
        convert_course = process.env.COURSE_CONVERT_RINKEBY;
        convert_startBlock = process.env.START_BLOCK_CONVERT_RINKEBY;
        convert_endBlock = process.env.END_BLOCK__CONVERT_RINKEBY;

        refund_startBlock = process.env.START_BLOCK_REFUND_RINKEBY;
        refund_endBlock = process.env.END_BLOCK_REFUND_RINKEBY;
    } else if (network === 'mainnet') {
        controller = process.env.CONTROLLER_MAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_MAINNET;

        compensation_stableCoin = process.env.STABLECOIN_MAINNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_MAINNET;
        compensation_endBlock = process.env.END_BLOCK_COMPENSATION_MAINNET;
        rewardApy = process.env.REWARD_APY_MAINNET;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_MAINNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_MAINNET;
        convert_course = process.env.COURSE_CONVERT_MAINNET;
        convert_startBlock = process.env.START_BLOCK_CONVERT_MAINNET;
        convert_endBlock = process.env.END_BLOCK__CONVERT_MAINNET;

        refund_startBlock = process.env.START_BLOCK_REFUND_MAINNET;
        refund_endBlock = process.env.END_BLOCK_REFUND_MAINNET;
    } else if (network === 'bsctestnet') {
        controller = process.env.CONTROLLER_BSCTESTNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_BSCTESTNET;

        compensation_stableCoin = process.env.STABLECOIN_BSCTESTNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_BSCTESTNET;
        compensation_endBlock = process.env.END_BLOCK_COMPENSATION_BSCTESTNET;
        rewardApy = process.env.REWARD_APY_BSCTESTNET;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_BSCTESTNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_BSCTESTNET;
        convert_course = process.env.COURSE_CONVERT_BSCTESTNET;
        convert_startBlock = process.env.START_BLOCK_CONVERT_BSCTESTNET;
        convert_endBlock = process.env.END_BLOCK__CONVERT_BSCTESTNET;

        refund_startBlock = process.env.START_BLOCK_REFUND_BSCTESTNET;
        refund_endBlock = process.env.END_BLOCK_REFUND_BSCTESTNET;
    } else if (network === 'bscmainnet') {
        controller = process.env.CONTROLLER_BSCMAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_BSCMAINNET;

        compensation_stableCoin = process.env.STABLECOIN_BSCMAINNET;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_BSCMAINNET;
        compensation_endBlock = process.env.END_BLOCK_COMPENSATION_BSCMAINNET;
        rewardApy = process.env.REWARD_APY_BSCMAINNET;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_BSCMAINNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_BSCMAINNET;
        convert_course = process.env.COURSE_CONVERT_BSCMAINNET;
        convert_startBlock = process.env.START_BLOCK_CONVERT_BSCMAINNET;
        convert_endBlock = process.env.END_BLOCK__CONVERT_BSCMAINNET;

        refund_startBlock = process.env.START_BLOCK_REFUND_BSCMAINNET;
        refund_endBlock = process.env.END_BLOCK_REFUND_BSCMAINNET;
    } else if (network === 'mumbai') {
        controller = process.env.CONTROLLER_MUMBAI;
        ETHUSDPriceFeed = process.env.PRICEFEED_MUMBAI;

        compensation_stableCoin = process.env.STABLECOIN_MUMBAI;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_MUMBAI;
        compensation_endBlock = process.env.END_BLOCK_COMPENSATION_MUMBAI;
        rewardApy = process.env.REWARD_APY_MUMBAI;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_MUMBAI;
        convert_tokenTo = process.env.TOKENTO_CONVERT_MUMBAI;
        convert_course = process.env.COURSE_CONVERT_MUMBAI;
        convert_startBlock = process.env.START_BLOCK_CONVERT_MUMBAI;
        convert_endBlock = process.env.END_BLOCK__CONVERT_MUMBAI;

        refund_startBlock = process.env.START_BLOCK_REFUND_MUMBAI;
        refund_endBlock = process.env.END_BLOCK_REFUND_MUMBAI;
    } else if (network === 'polygon') {
        controller = process.env.CONTROLLER_POLYGON;
        ETHUSDPriceFeed = process.env.PRICEFEED_POLYGON;

        compensation_stableCoin = process.env.STABLECOIN_POLYGON;
        compensation_startBlock = process.env.START_BLOCK_COMPENSATION_POLYGON;
        compensation_endBlock = process.env.END_BLOCK_COMPENSATION_POLYGON;
        rewardApy = process.env.REWARD_APY_POLYGON;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_POLYGON;
        convert_tokenTo = process.env.TOKENTO_CONVERT_POLYGON;
        convert_course = process.env.COURSE_CONVERT_POLYGON;
        convert_startBlock = process.env.START_BLOCK_CONVERT_POLYGON;
        convert_endBlock = process.env.END_BLOCK__CONVERT_POLYGON;

        refund_startBlock = process.env.START_BLOCK_REFUND_POLYGON;
        refund_endBlock = process.env.END_BLOCK_REFUND_POLYGON;
    } else {
        console.log("Bad network");
    }

    const compensation = await Compensation.deploy(
        compensation_stableCoin,
        compensation_startBlock,
        compensation_endBlock,
        controller,
        ETHUSDPriceFeed,
        rewardApy
    );
    console.log("Compensation deployed to:", compensation.address);

    const convert = await Convert.deploy(
        convert_pTokenFrom,
        convert_tokenTo,
        convert_course,
        convert_startBlock,
        convert_endBlock,
        controller,
        ETHUSDPriceFeed
    );
    console.log("Convert deployed to:", convert.address);

    const refund = await Refund.deploy(
        refund_startBlock,
        refund_endBlock,
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
