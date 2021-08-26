const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');

describe("Compensation", function () {
    let compensation, Compensation;
    let mainMock, MainMock, ERC20Token, MockPToken;

    let controller;
    let ETHUSDPriceFeed;

    let compensation_stableCoin;
    let compensation_startBlock;
    let compensation_endBlock;

    let owner, accounts;

    before(async () => {
        MainMock = await hre.ethers.getContractFactory("MainMock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        MockPToken = await hre.ethers.getContractFactory("MockPToken");
        Compensation = await hre.ethers.getContractFactory("Compensation");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mainMock = await MainMock.deploy();
        console.log("MainMock deployed to:", mainMock.address);

        controller = mainMock.address;
        ETHUSDPriceFeed = mainMock.address;

        let amount = '1000000000000000000000000';
        const stable = await ERC20Token.deploy(
            amount,
            'USDT',
            'USDT'
        );
        console.log("Stable deployed to:", stable.address);

        compensation_stableCoin = stable.address;

        let currentBlockNumBefore = await ethers.provider.getBlockNumber();
        compensation_startBlock = 10 + currentBlockNumBefore;
        compensation_endBlock = 100 + currentBlockNumBefore;

        compensation = await Compensation.deploy(
            compensation_stableCoin,
            compensation_startBlock,
            compensation_endBlock,
            controller,
            ETHUSDPriceFeed,
        );
        console.log("Compensation deployed to:", compensation.address);
    });

    describe('Constructor', async () => {
        it('check deploy data', async () => {
            const [stableCoin, startBlock, endBlock, contractController, contractETHUSDPriceFeed] = await Promise.all([
                compensation.stableCoin(),
                compensation.startBlock(),
                compensation.endBlock(),
                compensation.controller(),
                compensation.ETHUSDPriceFeed()
            ]);

            expect(stableCoin).to.be.equal(compensation_stableCoin);
            expect(startBlock).to.be.equal(compensation_startBlock);
            expect(endBlock).to.be.equal(compensation_endBlock);
            expect(contractController).to.be.equal(controller);
            expect(contractETHUSDPriceFeed).to.be.equal(ETHUSDPriceFeed);
        });

        it('check init data', async () => {
            await expect(
                Compensation.deploy(
                    ethers.constants.AddressZero,
                    compensation_startBlock,
                    compensation_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.compensationConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startBlock,
                    compensation_endBlock,
                    controller,
                    ethers.constants.AddressZero,
                )).to.be.revertedWith(revertMessages.compensationConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startBlock,
                    compensation_endBlock,
                    ethers.constants.AddressZero,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.compensationConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    '0',
                    compensation_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.compensationConstructorBlockNumIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startBlock,
                    '0',
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.compensationConstructorBlockNumIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    '200',
                    '100',
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.compensationConstructorStartBlockIsMoreThanCurrentBlockAndMoreThanEndBlock);
        });
    });

    describe('Transactions', async () => {
        it('check data', async () => {
            // 1. deploy contract
            // 2. add pToken
            // 3. add 3 checkpoint
            // 4. 3 users call compensation
            // 5. claim
            // 6. remove unused tokens
        });
    });

});
