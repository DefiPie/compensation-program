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

    // const convert = await Convert.deploy(
    //     convert_pTokenFrom,
    //     convert_tokenTo,
    //     convert_startTimestamp,
    //     convert_endTimestamp,
    //     controller,
    //     ETHUSDPriceFeed,
    //     reservoir
    // );
    // console.log("Convert deployed to:", convert.address);

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

        // let ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        // let stableCoinContract = await ERC20Token.attach(process.env.STABLECOIN_RINKEBY);
        // await stableCoinContract.approve(compensation.address, 1000000000);

        // ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        // let tokenTo = await ERC20Token.attach(process.env.TOKENTO_CONVERT_RINKEBY);
        // await tokenTo.mint(1000000000000000);
        //await tokenTo.approve(convert.address, 1000000000000000);
    } else if (network === 'bscmainnet') {
        const pBNB = '0x7D5a5B8351d0e41549C1100C7834E76D04571e16';
        const pBUSD = '0x6a999349e61a5bE36C854bDc44CaaFe3B5495C89';
        const pLIGHT = '0x94a5F50d2041B664ea524f44172531697Bd3eAeF';
        const pESWAP = '0xA4BB64b709D69229B06C4810c4f3Dc8044c19468';
        const pSHIELD = '0x48Fa81085253b719a80776DC58569aFf10bfE422';
        const pFSXU = '0xbF7A255f84bE78f2D6F0d0Aa87F630E71278B798';
        const pORK = '0xD24578d8f29012025790817AeE82236a81CF764f';
        const pCAKE = '0x2B1a86c88Cb2478bd2D174b81E804E46FF6B8F59';
        const pCBRL = '0xc4Ecd8973e2eB711A88E0516A1dEff008AEBD3eC';
        const pNUTS = '0xD0d4aF9b3f07cB6e0EBa39cADc722227d3C32a6F';
        const pXVS = '0x85Ca6956E1a0704a890252174671Fbf0f2E2D2cA';
        const pCROW = '0x3aA13Aa3849Ba3B391E6022878926B2887A61740';

        await compensation.addPToken(pBNB, '7324747903615477140');
        await compensation.addPToken(pBUSD, '22831813462798684');
        await compensation.addPToken(pLIGHT, '2307564457318948');
        await compensation.addPToken(pESWAP, '7420478837024048');
        await compensation.addPToken(pSHIELD, '93908107017140104');
        await compensation.addPToken(pFSXU, '20608036342773');
        await compensation.addPToken(pORK, '5005561942355496');
        await compensation.addPToken(pCAKE, '349105868741729534');
        await compensation.addPToken(pCBRL, '3875887400680000');
        await compensation.addPToken(pNUTS, '39209417560488384');
        await compensation.addPToken(pXVS, '381565545915567690');
        //await compensation.addPToken(pCROW, '230520623452963295');

        const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
        const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
        const LIGHT = '0x7B9c3Df47F3326FbC0674d51dc3EB0f2Df29F37F';
        const ESWAP = '0x1b79708EeA29900DbbbcA8A5Ae620aC741618ae4';
        const SHIELD = '0x60b3BC37593853c04410c4F07fE4D6748245BF77';
        const FSXU = '0xa94b7a842aADB617a0B08fA744e033C6De2f7595';
        const ORK = '0xCed0CE92F4bdC3c2201E255FAF12f05cf8206dA8';
        const CAKE = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
        const CBRL = '0x9E691FD624410D631c082202b050694233031cB7';
        const NUTS = '0x8893D5fA71389673C5c4b9b3cb4EE1ba71207556';
        const XVS = '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63';
        const CROW = '0xcc2E12a9b5b75360c6FBf23B584c275D52cDdb0E';

        await refund.addRefundPair(pBNB, WBNB, '23628219043920894');
        await refund.addRefundPair(pBUSD, BUSD, '22831813462798684');
        await refund.addRefundPair(pLIGHT, LIGHT, '23075644573189480');
        await refund.addRefundPair(pESWAP, ESWAP, '20612441213955690');
        await refund.addRefundPair(pSHIELD, SHIELD, '20023050536703647');
        await refund.addRefundPair(pFSXU, FSXU, '20608036342772935');
        await refund.addRefundPair(pORK, ORK, '20022247769421984');
        await refund.addRefundPair(pCAKE, CAKE, '23993530497713370');
        await refund.addRefundPair(pCBRL, CBRL, '20399407372000000');
        await refund.addRefundPair(pNUTS, NUTS, '21783009755826880');
        await refund.addRefundPair(pXVS, XVS, '20625164644084740');
        //await refund.addRefundPair(pCROW, CROW, '22801248610579950');
    } else if (network === 'mainnet') {
        const pETH = '0xd43a42eaA613668B4fb6615F98c82fFC9dA6A516';
        const pUSDT = '0xA8BE87c8EC022e1F27454B379214B18b568570aE';
        const pZEFU = '0x90Fbe2519195228c1A5afB67685Fe78061c1F5Ae';
        const pDAI = '0xd8Bf76686F818d5cB0FFCFA67F68Aff8B69DC2dc';
        const pUSDC = '0xB12b261f1C86d7F535DfEA9622176bf0197e2Bd0';
        const pEDDA = '0x09D20Ec732b8E7F18598f7D1ca04d40f3F4579ed';
        const pINFI = '0x89ce2177B42f40508648A1fD4a924CCA77cd480d';
        const pPOLC = '0x3F21553eB4D9347799533B311859fEEEB0e29392';

        await compensation.addPToken(pETH, '49370369991939036000');
        await compensation.addPToken(pUSDT, '24012498710890800');
        await compensation.addPToken(pZEFU, '1085955107372053');
        await compensation.addPToken(pDAI, '20125028496986050');
        await compensation.addPToken(pUSDC, '21735568691029800');
        await compensation.addPToken(pEDDA, '22498669902348706000');
        await compensation.addPToken(pINFI, '991020131680288');
        await compensation.addPToken(pPOLC, '2017243683605837');

        const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
        const ZEFU = '0xB1e9157c2Fdcc5a856C8DA8b2d89b6C32b3c1229';
        const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
        const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
        const EDDA = '0xFbbE9b1142C699512545f47937Ee6fae0e4B0aA9';
        const INFI = '0x159751323A9E0415DD3d6D42a1212fe9F4a0848C';
        const POLC = '0xaA8330FB2B4D5D07ABFE7A72262752a8505C6B37';

        await refund.addRefundPair(pETH, WETH, '24685184995969518');
        await refund.addRefundPair(pUSDT, USDT, '24012498710890800');
        await refund.addRefundPair(pZEFU, ZEFU, '24132335719378960');
        await refund.addRefundPair(pDAI, DAI, '20125028496986050');
        await refund.addRefundPair(pUSDC, USDC, '21735568691029800');
        await refund.addRefundPair(pEDDA, EDDA, '20453336274862460');
        await refund.addRefundPair(pINFI, INFI, '22022669592895283');
        await refund.addRefundPair(pPOLC, POLC, '24014805757212340');
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
