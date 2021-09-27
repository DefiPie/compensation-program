// npx hardhat run --network rinkeby scripts/deploy.js
// npx hardhat verify --network rinkeby 0x9715781e1A4E0D4893898dFefB3f025910488354 "0xC30b2CDC93d72a45B63472FFB095928a5A9Ab8f0"

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
    const [deployer] = await ethers.getSigners();

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

    if (network === 'hardhat') {
        const MainMock = await hre.ethers.getContractFactory("MainMock");
        const mainMock = await MainMock.deploy();
        console.log("MainMock deployed to:", mainMock.address);

        controller = mainMock.address;
        ETHUSDPriceFeed = mainMock.address;

        const ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        let amount = '100000000000000000000';
        const stable = await ERC20Token.deploy(
            amount,
            'USDT',
            'USDT'
        );
        console.log("Stable deployed to:", stable.address);

        rewardApy = '250000000000000000'; // 25% - 25e16
        lastApyTimestamp = '400';

        compensation_stableCoin = stable.address;
        compensation_startTimestamp = '10';
        compensation_endTimestamp = '100';

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

        convert_startTimestamp = '10';
        convert_endTimestamp = '100';
        reservoir = deployer.address;

        refund_startTimestamp = '10';
        refund_endTimestamp = '100';

    } else if (network === 'rinkeby') {
        controller = process.env.CONTROLLER_RINKEBY;
        ETHUSDPriceFeed = process.env.PRICEFEED_RINKEBY;

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

    } else if (network === 'mainnet') {
        controller = process.env.CONTROLLER_MAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_MAINNET;

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
    } else if (network === 'bsctestnet') {
        controller = process.env.CONTROLLER_BSCTESTNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_BSCTESTNET;

        compensation_stableCoin = process.env.STABLECOIN_BSCTESTNET;
        compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_BSCTESTNET;
        compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_BSCTESTNET;
        rewardApy = process.env.REWARD_APY_BSCTESTNET;
        lastApyTimestamp = process.env.BSCTESTNET_LAST_APY_TIMESTAMP;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_BSCTESTNET;
        convert_tokenTo = process.env.TOKENTO_CONVERT_BSCTESTNET;
        convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_BSCTESTNET;
        convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_BSCTESTNET;
        reservoir = process.env.BSCTESTNET_RESERVOIR;

        refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_BSCTESTNET;
        refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_BSCTESTNET;
    } else if (network === 'bscmainnet') {
        controller = process.env.CONTROLLER_BSCMAINNET;
        ETHUSDPriceFeed = process.env.PRICEFEED_BSCMAINNET;

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
    } else if (network === 'mumbai') {
        controller = process.env.CONTROLLER_MUMBAI;
        ETHUSDPriceFeed = process.env.PRICEFEED_MUMBAI;

        compensation_stableCoin = process.env.STABLECOIN_MUMBAI;
        compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_MUMBAI;
        compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_MUMBAI;
        rewardApy = process.env.REWARD_APY_MUMBAI;
        lastApyTimestamp = process.env.MUMBAI_LAST_APY_TIMESTAMP;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_MUMBAI;
        convert_tokenTo = process.env.TOKENTO_CONVERT_MUMBAI;
        convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_MUMBAI;
        convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_MUMBAI;
        reservoir = process.env.MUMBAI_RESERVOIR;

        refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_MUMBAI;
        refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_MUMBAI;
    } else if (network === 'polygon') {
        controller = process.env.CONTROLLER_POLYGON;
        ETHUSDPriceFeed = process.env.PRICEFEED_POLYGON;

        compensation_stableCoin = process.env.STABLECOIN_POLYGON;
        compensation_startTimestamp = process.env.START_TIMESTAMP_COMPENSATION_POLYGON;
        compensation_endTimestamp = process.env.END_TIMESTAMP_COMPENSATION_POLYGON;
        rewardApy = process.env.REWARD_APY_POLYGON;
        lastApyTimestamp = process.env.POLYGON_LAST_APY_TIMESTAMP;

        convert_pTokenFrom = process.env.PTOKENFROM_CONVERT_POLYGON;
        convert_tokenTo = process.env.TOKENTO_CONVERT_POLYGON;
        convert_startTimestamp = process.env.START_TIMESTAMP_CONVERT_POLYGON;
        convert_endTimestamp = process.env.END_TIMESTAMP_CONVERT_POLYGON;
        reservoir = process.env.POLYGON_RESERVOIR;

        refund_startTimestamp = process.env.START_TIMESTAMP_REFUND_POLYGON;
        refund_endTimestamp = process.env.END_TIMESTAMP_REFUND_POLYGON;
    } else {
        console.log("Bad network");
    }

    const compensation = await Compensation.deploy(
        compensation_stableCoin,
        compensation_startTimestamp,
        compensation_endTimestamp,
        controller,
        ETHUSDPriceFeed,
        rewardApy,
        lastApyTimestamp
    );
    console.log("Compensation deployed to:", compensation.address);

    const convert = await Convert.deploy(
        convert_pTokenFrom,
        convert_tokenTo,
        convert_startTimestamp,
        convert_endTimestamp,
        controller,
        ETHUSDPriceFeed,
        reservoir
    );
    console.log("Convert deployed to:", convert.address);

    const refund = await Refund.deploy(
        refund_startTimestamp,
        refund_endTimestamp,
        controller,
        ETHUSDPriceFeed,
        calcPoolPrice
    );
    console.log("Refund deployed to:", refund.address);

    if (network === 'rinkeby') {
        let pUni = '0xb91B6e944F7d0c8FC96F57D4d44bc9aa818b4571';
        let pBat = '0xc3231C1862e9fE6cee71ce11e6Fb81F2d8470257';

        let pUniPrice =  '20000000000000000'; // 1 pToken1 = $0.02  (1 token = $1)
        let pBatPrice =   '6000000000000000'; // 1 pToken1 = $0.006 (1 token = $0.3)

        await compensation.addPToken(pUni, pUniPrice);
        await compensation.addPToken(pBat, pBatPrice);

        let Uni = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
        let Bat = '0xbf7a7169562078c96f0ec1a8afd6ae50f12e5a99';

        let pUniCourse = '20000000000000000'; // 2e16, 1 baseToken1 = 50 pToken1
        let pBatCourse = '20408163000000000'; // 20408163e9, 1 baseToken2 = 49 pToken2

        let tx3 = await refund.addRefundPair(pUni, Uni, pUniCourse);
        let tx4 = await refund.addRefundPair(pBat, Bat, pBatCourse);

        let ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        let stableCoinContract = await ERC20Token.attach(process.env.STABLECOIN_RINKEBY);
        await stableCoinContract.approve(compensation.address, 1000000000);

        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        let tokenTo = await ERC20Token.attach(process.env.TOKENTO_CONVERT_RINKEBY);
        await tokenTo.mint(1000000000000000);
        await tokenTo.approve(convert.address, 1000000000000000);
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
