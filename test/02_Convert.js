const { expect } = require("chai");
const { ethers } = require('hardhat');

describe("Convert", function () {
    let convert, Convert;
    let mock, Mock, ERC20Token;
    let tokenTo, pToken;

    let controller;
    let ETHUSDPriceFeed;

    let convert_pTokenFrom;
    let convert_tokenTo;
    let convert_course = '20000000000000000'; // 0.02e18
    let convert_startBlock = '10';
    let convert_endBlock = '100';

    let owner;

    before(async () => {
        Mock = await hre.ethers.getContractFactory("Mock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        Convert = await hre.ethers.getContractFactory("Convert");

        [owner] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mock = await Mock.deploy();
        console.log("Mock deployed to:", mock.address);

        controller = mock.address;
        ETHUSDPriceFeed = mock.address;

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

    describe('Transactions', async () => {
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
});
