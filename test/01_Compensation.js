const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');

describe("Compensation", function () {
    let compensation, Compensation;
    let mainMock, MainMock, ERC20Token, MockPToken;
    let stable;

    let controller;
    let ETHUSDPriceFeed;

    let compensation_stableCoin;
    let compensation_startBlock;
    let compensation_endBlock;

    let owner, accounts;

    before(async () => {
        MainMock = await hre.ethers.getContractFactory("MainMock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20TokenDec6");
        MockPToken = await hre.ethers.getContractFactory("MockPToken");
        Compensation = await hre.ethers.getContractFactory("Compensation");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mainMock = await MainMock.deploy();
        console.log("MainMock deployed to:", mainMock.address);

        controller = mainMock.address;
        ETHUSDPriceFeed = mainMock.address;

        let amount = '1000000000000'; // 1,000,000e6
        stable = await ERC20Token.deploy(
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
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startBlock,
                    compensation_endBlock,
                    ethers.constants.AddressZero,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

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
            let blockNumBefore = await ethers.provider.getBlockNumber();
            compensation_startBlock = +blockNumBefore + 90;
            compensation_endBlock = +compensation_startBlock + 100;

            compensation = await Compensation.deploy(
                compensation_stableCoin,
                compensation_startBlock,
                compensation_endBlock,
                controller,
                ETHUSDPriceFeed,
            );
            console.log("Compensation deployed to:", compensation.address);

            // 2. add pToken
            let amount = '1000000000000000000000000'; // 1000000e18
            const pToken1 = await MockPToken.deploy(
                amount,
                'pToken1',
                'pToken1'
            );

            const pToken2 = await MockPToken.deploy(
                amount,
                'pToken2',
                'pToken2'
            );

            const pToken3 = await MockPToken.deploy(
                amount,
                'pToken3',
                'pToken3'
            );

            let price1 =  '20000000000000000'; // 1 pToken1 = $0.02  (1 token = $1)
            let price2 = '300000000000000000'; // 1 pToken1 = $0.3   (1 token = $15)
            let price3 =   '6000000000000000'; // 1 pToken1 = $0.006 (1 token = $0.3)

            await expect(
                compensation.connect(accounts[0]).addPToken(pToken1.address, price3)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await compensation.addPToken(pToken1.address, price1);
            await compensation.addPToken(pToken2.address, price2);
            await compensation.addPToken(pToken3.address, price3);

            const [contractPrice1, contractPrice2, contractPrice3] = await Promise.all([
                compensation.pTokens(pToken1.address),
                compensation.pTokens(pToken2.address),
                compensation.pTokens(pToken3.address),
            ]);

            expect(contractPrice1.toString()).to.be.equal(price1);
            expect(contractPrice2.toString()).to.be.equal(price2);
            expect(contractPrice3.toString()).to.be.equal(price3);

            // 3. add 3 checkpoint
            let stableAmount1 = '1000000000'; // 100e6
            let stableAmount2 = '3000000000'; // 300e6
            let stableAmount3 = '7000000000'; // 700e6

            await expect(
                compensation.connect(accounts[0]).addCheckpoint(stableAmount1)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await stable.approve(compensation.address, stableAmount1);

            const ownerBalanceBefore = await stable.balanceOf(owner.address);
            const refundContractBalanceBefore = await stable.balanceOf(compensation.address);

            await compensation.addCheckpoint(stableAmount1);

            const ownerBalanceAfter = await stable.balanceOf(owner.address);
            const refundBalanceAfter = await stable.balanceOf(compensation.address);

            expect(ownerBalanceBefore.sub(ownerBalanceAfter).toString()).to.be.equal(stableAmount1);
            expect(refundBalanceAfter.sub(refundContractBalanceBefore).toString()).to.be.equal(stableAmount1);

            let checkpointLength = await compensation.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(1);

            let checkpoints = await compensation.checkpoints(0);
            expect(checkpoints.toString()).to.be.equal(stableAmount1);

            await stable.approve(compensation.address, stableAmount2);
            await compensation.addCheckpoint(stableAmount2);

            checkpointLength = await compensation.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(2);

            checkpoints = await compensation.checkpoints(1);
            expect(checkpoints.toString()).to.be.equal(stableAmount2);

            await stable.approve(compensation.address, stableAmount3);
            await compensation.addCheckpoint(stableAmount3);

            checkpointLength = await compensation.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(3);

            checkpoints = await compensation.checkpoints(2);
            expect(checkpoints.toString()).to.be.equal(stableAmount3);

            // 4. 3 users call compensation


            // 5. claim
            // 6. remove unused tokens
        });
    });

});
