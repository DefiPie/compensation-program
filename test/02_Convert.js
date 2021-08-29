const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');

describe("Convert", function () {
    let convert, Convert;
    let mainMock, MainMock, ERC20Token, MockPToken;
    let tokenTo, pToken;

    let controller;
    let ETHUSDPriceFeed;

    let convert_pTokenFrom;
    let convert_tokenTo;
    let convert_course = '20000000000000000'; // 0.02e18
    let convert_startBlock = '10';
    let convert_endBlock = '100';

    let owner, accounts;

    before(async () => {
        MainMock = await hre.ethers.getContractFactory("MainMock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        MockPToken = await hre.ethers.getContractFactory("MockPToken");
        Convert = await hre.ethers.getContractFactory("Convert");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mainMock = await MainMock.deploy();
        console.log("MainMock deployed to:", mainMock.address);

        controller = mainMock.address;
        ETHUSDPriceFeed = mainMock.address;

        let amount = '100000000000000000000';
        pToken = await ERC20Token.deploy(
            amount,
            'pToken1',
            'pToken1'
        );
        console.log("PToken deployed to:", pToken.address);

        convert_pTokenFrom = pToken.address;

        amount = '100000000000000000000';
        tokenTo = await ERC20Token.deploy(
            amount,
            'tokenTo',
            'tokenTo'
        );
        console.log("TokenTo deployed to:", tokenTo.address);

        convert_tokenTo = tokenTo.address;

        let currentBlockNumBefore = await ethers.provider.getBlockNumber();
        convert_startBlock = 10 + currentBlockNumBefore;
        convert_endBlock = 100 + currentBlockNumBefore;

        convert = await Convert.deploy(
            convert_pTokenFrom,
            convert_tokenTo,
            convert_course,
            convert_startBlock,
            convert_endBlock,
            controller,
            ETHUSDPriceFeed,
        );
        console.log("Convert deployed to:", convert.address);
    });

    describe('Constructor', async () => {
        it('check deploy data', async () => {
            const [pTokenFrom, tokenTo, course, startBlock, endBlock, contractController, contractETHUSDPriceFeed] = await Promise.all([
                convert.pTokenFrom(),
                convert.tokenTo(),
                convert.course(),
                convert.startBlock(),
                convert.endBlock(),
                convert.controller(),
                convert.ETHUSDPriceFeed()
            ]);

            expect(pTokenFrom).to.be.equal(convert_pTokenFrom);
            expect(tokenTo).to.be.equal(convert_tokenTo);
            expect(course).to.be.equal(convert_course);
            expect(startBlock).to.be.equal(convert_startBlock);
            expect(endBlock).to.be.equal(convert_endBlock);
            expect(contractController).to.be.equal(controller);
            expect(contractETHUSDPriceFeed).to.be.equal(ETHUSDPriceFeed);
        });
    });

    describe('Transactions', async () => {
        it('check data', async () => {
            // 1. deploy contract
            // 2. add token
            // 3. add 3 checkpoint
            // 4. 3 users call convert
            // 5. claimToken
            // 6. remove unused tokens
        });
    });
});
