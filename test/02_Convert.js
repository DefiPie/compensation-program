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

        amount = '100000000000000000000000'; //100,000e18
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

        it('check init data', async () => {
            await expect(
                Convert.deploy(
                    ethers.constants.AddressZero,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    ethers.constants.AddressZero,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    ethers.constants.AddressZero,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ethers.constants.AddressZero,
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    '0',
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorNumIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    '0',
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorNumIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    '0',
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorNumIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    '1000',
                    '100',
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorStartBlockIsMoreThanCurrentBlockAndMoreThanEndBlock);
        });
    });

    describe('Transactions', async () => {
        it('check data', async () => {
            // 1. deploy contract
            let blockNumBefore = await ethers.provider.getBlockNumber();
            convert_startBlock = +blockNumBefore + 90;
            convert_endBlock = +convert_startBlock + 100;

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

            // 2. add 3 checkpoint
            let amount1 = '150000000000000000000'; // 150e18
            let amount2 = '350000000000000000000'; // 350e18
            let amount3 = '500000000000000000000'; // 500e18

            let fromBlockFirstCheckpoint = +convert_startBlock + 1;
            let toBlockFirstCheckpoint = +fromBlockFirstCheckpoint + 10;
            let percentFirstCheckpoint = '100000000000000000'; // 1%

            await expect(
                convert.connect(accounts[0]).addCheckpointAndTokensAmount(fromBlockFirstCheckpoint, toBlockFirstCheckpoint, percentFirstCheckpoint, amount1)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await tokenTo.approve(convert.address, amount1);

            const ownerBalanceBefore = await tokenTo.balanceOf(owner.address);
            const convertContractBalanceBefore = await tokenTo.balanceOf(convert.address);
            //
            await convert.addCheckpointAndTokensAmount(fromBlockFirstCheckpoint, toBlockFirstCheckpoint, percentFirstCheckpoint, amount1);
            //
            const ownerBalanceAfter = await tokenTo.balanceOf(owner.address);
            const convertBalanceAfter = await tokenTo.balanceOf(convert.address);

            expect(ownerBalanceBefore.sub(ownerBalanceAfter).toString()).to.be.equal(amount1);
            expect(convertBalanceAfter.sub(convertContractBalanceBefore).toString()).to.be.equal(amount1);

            let checkpointLength = await convert.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(1);

            let firstCheckpoint = await convert.checkpoints(0);
            expect(firstCheckpoint.fromBlock).to.be.equal(fromBlockFirstCheckpoint);
            expect(firstCheckpoint.toBlock).to.be.equal(toBlockFirstCheckpoint);
            expect(firstCheckpoint.percent.toString()).to.be.equal(percentFirstCheckpoint);
            expect(firstCheckpoint.amount.toString()).to.be.equal(amount1);

            // 3. 3 users call convert
            // 4. claimToken
            // 5. remove unused tokens
        });
    });
});
