const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');
const BigNumber = require("bignumber.js");

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
            await mainMock.addPToken(pToken1.address);
            await mainMock.addPToken(pToken2.address);
            await mainMock.addPToken(pToken3.address);

            let acc0amount1 = '2850000000000000000000'; //  57e18 * 50
            let acc1amount1 = '4650000000000000000000'; //  93e18 * 50
            let acc2amount1 = '7500000000000000000000'; // 150e18 * 50

            let acc0amount2 =  '950000000000000000000'; //  19e18 * 50
            let acc1amount2 = '1550000000000000000000'; //  31e18 * 50
            let acc2amount2 = '2500000000000000000000'; //  50e18 * 50

            let acc0amount3 =  '6783000000000000000000'; // 133e18 * 51
            let acc1amount3 = '11067000000000000000000'; // 217e18 * 51
            let acc2amount3 = '17850000000000000000000'; // 350e18 * 51

            await pToken1.transfer(accounts[0].address, acc0amount1);
            await pToken1.transfer(accounts[1].address, acc1amount1);
            await pToken1.transfer(accounts[2].address, acc2amount1);

            await pToken2.transfer(accounts[0].address, acc0amount2);
            await pToken2.transfer(accounts[1].address, acc1amount2);
            await pToken2.transfer(accounts[2].address, acc2amount2);

            await pToken3.transfer(accounts[0].address, acc0amount3);
            await pToken3.transfer(accounts[1].address, acc1amount3);
            await pToken3.transfer(accounts[2].address, acc2amount3);

            await pToken1.connect(accounts[0]).approve(compensation.address, acc0amount1);
            await pToken1.connect(accounts[1]).approve(compensation.address, acc1amount1);
            await pToken1.connect(accounts[2]).approve(compensation.address, acc2amount1);

            await pToken2.connect(accounts[0]).approve(compensation.address, acc0amount2);
            await pToken2.connect(accounts[1]).approve(compensation.address, acc1amount2);
            await pToken2.connect(accounts[2]).approve(compensation.address, acc2amount2);

            await pToken3.connect(accounts[0]).approve(compensation.address, acc0amount3);
            await pToken3.connect(accounts[1]).approve(compensation.address, acc1amount3);
            await pToken3.connect(accounts[2]).approve(compensation.address, acc2amount3);

            // ==========
            // first pool
            // ==========

            const pToken1Acc0BalanceBefore = await pToken1.balanceOf(accounts[0].address);
            let pToken1RefundContractBalanceBefore = await pToken1.balanceOf(compensation.address);

            await compensation.connect(accounts[0]).compensation(pToken1.address, acc0amount1);

            const pToken1Acc0BalanceAfter = await pToken1.balanceOf(accounts[0].address);
            let pToken1RefundBalanceAfter = await pToken1.balanceOf(compensation.address);

            expect(pToken1Acc0BalanceBefore.sub(pToken1Acc0BalanceAfter).toString()).to.be.equal(acc0amount1);
            expect(pToken1RefundBalanceAfter.sub(pToken1RefundContractBalanceBefore).toString()).to.be.equal(acc0amount1);

            const pToken1Acc1BalanceBefore = await pToken1.balanceOf(accounts[1].address);
            pToken1RefundContractBalanceBefore = await pToken1.balanceOf(compensation.address);

            await compensation.connect(accounts[1]).compensation(pToken1.address, acc1amount1);

            const pToken1Acc1BalanceAfter = await pToken1.balanceOf(accounts[1].address);
            pToken1RefundBalanceAfter = await pToken1.balanceOf(compensation.address);

            expect(pToken1Acc1BalanceBefore.sub(pToken1Acc1BalanceAfter).toString()).to.be.equal(acc1amount1);
            expect(pToken1RefundBalanceAfter.sub(pToken1RefundContractBalanceBefore).toString()).to.be.equal(acc1amount1);

            const pToken1Acc2BalanceBefore = await pToken1.balanceOf(accounts[2].address);
            pToken1RefundContractBalanceBefore = await pToken1.balanceOf(compensation.address);

            await compensation.connect(accounts[2]).compensation(pToken1.address, acc2amount1);

            const pToken1Acc2BalanceAfter = await pToken1.balanceOf(accounts[2].address);
            pToken1RefundBalanceAfter = await pToken1.balanceOf(compensation.address);

            expect(pToken1Acc2BalanceBefore.sub(pToken1Acc2BalanceAfter).toString()).to.be.equal(acc2amount1);
            expect(pToken1RefundBalanceAfter.sub(pToken1RefundContractBalanceBefore).toString()).to.be.equal(acc2amount1);

            let compensationAmount1 = await compensation.calcCompensationAmount(pToken1.address, acc0amount1);
            expect(compensationAmount1.toString()).to.be.equal('57000000');

            let compensationAmount2 = await compensation.calcCompensationAmount(pToken1.address, acc1amount1);
            expect(compensationAmount2.toString()).to.be.equal('93000000');

            let compensationAmount3 = await compensation.calcCompensationAmount(pToken1.address, acc2amount1);
            expect(compensationAmount3.toString()).to.be.equal('150000000');

            // ===========
            // second pool
            // ===========
            let pToken2RefundBalanceBefore = await pToken2.balanceOf(compensation.address);

            await compensation.connect(accounts[0]).compensation(pToken2.address, acc0amount2);
            await compensation.connect(accounts[1]).compensation(pToken2.address, acc1amount2);

            await pToken2.setBorrowBalanceStored('1000000000');
            await mainMock.setUnderlyingPrice(pToken2.address, '1000000000000000000');

            await expect(
                compensation.connect(accounts[2]).compensation(pToken2.address, acc2amount2)
            ).to.be.revertedWith(revertMessages.compensationCompensationSumBorrowMustBeLessThan1);

            let pToken2RefundBalanceAfter = await pToken2.balanceOf(compensation.address);
            let sum0 = new BigNumber(acc0amount2);
            let sum1 = new BigNumber(acc1amount2);

            expect(pToken2RefundBalanceAfter.sub(pToken2RefundBalanceBefore).toString()).to.be.equal(sum0.plus(sum1).toFixed());

            // 5. claim
            let amount1 = await compensation.calcClaimAmount(accounts[0].address);
            expect(amount1.toString()).to.be.equal('342000000'); // 1 pool - $57, 57 tokens with $1 price, 2 pool = $285, 19 tokens with $15 price

            let amount2 = await compensation.calcClaimAmount(accounts[1].address);
            expect(amount2.toString()).to.be.equal('558000000'); // 1 pool - $93, 93 tokens with $1 price, 2 pool = $465, 31 tokens with $15 price

            let amount3 = await compensation.calcClaimAmount(accounts[2].address);
            expect(amount3.toString()).to.be.equal('150000000');

            let currentBlockNumBefore = await ethers.provider.getBlockNumber();

            for (let i = 0; i < compensation_startBlock - currentBlockNumBefore.toString(); i++) {
                await ethers.provider.send('evm_mine');
            }

            let stableAcc0BalanceBefore = await stable.balanceOf(accounts[0].address);
            let stableRefundContractBalanceBefore = await stable.balanceOf(compensation.address);

            await compensation.connect(accounts[0]).claimToken();

            let stableAcc0BalanceAfter = await stable.balanceOf(accounts[0].address);
            let stableRefundBalanceAfter = await stable.balanceOf(compensation.address);

            expect(stableAcc0BalanceAfter.sub(stableAcc0BalanceBefore).toString()).to.be.equal('342000000');
            expect(stableRefundContractBalanceBefore.sub(stableRefundBalanceAfter).toString()).to.be.equal('342000000');

            stableAcc0BalanceBefore = await stable.balanceOf(accounts[0].address);
            stableRefundContractBalanceBefore = await stable.balanceOf(compensation.address);

            await compensation.connect(accounts[0]).claimToken();

            stableAcc0BalanceAfter = await stable.balanceOf(accounts[0].address);
            stableRefundBalanceAfter = await stable.balanceOf(compensation.address);

            expect(stableAcc0BalanceAfter.sub(stableAcc0BalanceBefore).toString()).to.be.equal('0');
            expect(stableRefundContractBalanceBefore.sub(stableRefundBalanceAfter).toString()).to.be.equal('0');

            const stableAcc1BalanceBefore = await stable.balanceOf(accounts[1].address);
            stableRefundContractBalanceBefore = await stable.balanceOf(compensation.address);

            await compensation.connect(accounts[1]).claimToken();

            const stableAcc1BalanceAfter = await stable.balanceOf(accounts[1].address);
            stableRefundBalanceAfter = await stable.balanceOf(compensation.address);

            expect(stableAcc1BalanceAfter.sub(stableAcc1BalanceBefore).toString()).to.be.equal('558000000');
            expect(stableRefundContractBalanceBefore.sub(stableRefundBalanceAfter).toString()).to.be.equal('558000000');

            await expect(
                compensation.connect(accounts[0]).addBlackList(accounts[2].address)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await compensation.addBlackList(accounts[2].address);

            await expect(
                compensation.connect(accounts[2]).claimToken()
            ).to.be.revertedWith(revertMessages.compensationClaimTokenUserInBlackList);

            // 6. remove unused tokens
            await expect(
                compensation.connect(accounts[0]).removeUnused(stable.address, '10100000000')
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            currentBlockNumBefore = await ethers.provider.getBlockNumber();

            for (let i = 0; i < compensation_endBlock - currentBlockNumBefore.toString() + 1; i++) {
                await ethers.provider.send('evm_mine');
            }

            const stableOwnerBalanceBefore = await stable.balanceOf(owner.address);
            let stableCompensationContractBalanceBefore = await stable.balanceOf(compensation.address);

            await compensation.removeUnused(stable.address, '10100000000');

            const stableOwnerBalanceAfter = await stable.balanceOf(owner.address);
            let stableCompensationBalanceAfter = await stable.balanceOf(compensation.address);

            expect(stableOwnerBalanceAfter.sub(stableOwnerBalanceBefore).toString()).to.be.equal('10100000000');
            expect(stableCompensationContractBalanceBefore.sub(stableCompensationBalanceAfter).toString()).to.be.equal('10100000000');

            // 7. compensation after
            await pToken1.transfer(accounts[0].address, acc0amount1);
            await pToken1.connect(accounts[0]).approve(compensation.address, acc0amount1);

            for (let i = 0; i < 100; i++) {
                await ethers.provider.send('evm_mine');
            }

            await expect(
                compensation.compensation(pToken1.address, acc0amount1)
            ).to.be.revertedWith(revertMessages.compensationCompensationYouCanConvertPTokensBeforeStartBlockOnly);
        });
    });

});
