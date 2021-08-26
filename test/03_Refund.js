const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');
const BigNumber = require("bignumber.js");

describe("Refund", function () {
    let refund, Refund;
    let mainMock, MainMock, ERC20Token, MockPToken;

    let controller;
    let ETHUSDPriceFeed;

    let refund_startBlock;
    let refund_endBlock;

    let owner, accounts;

    before(async () => {
        MainMock = await hre.ethers.getContractFactory("MainMock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        MockPToken = await hre.ethers.getContractFactory("MockPToken");
        Refund = await hre.ethers.getContractFactory("Refund");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mainMock = await MainMock.deploy();
        console.log("MainMock deployed to:", mainMock.address);

        controller = mainMock.address;
        ETHUSDPriceFeed = mainMock.address;

        let currentBlockNumBefore = await ethers.provider.getBlockNumber();
        refund_startBlock = 10 + currentBlockNumBefore;
        refund_endBlock = 100 + currentBlockNumBefore;

        refund = await Refund.deploy(
            refund_startBlock,
            refund_endBlock,
            controller,
            ETHUSDPriceFeed,
        );
        console.log("Refund deployed to:", refund.address);
    });

    describe('Constructor', async () => {
        it('check deploy data', async () => {
            const [startBlock, endBlock, contractController, contractETHUSDPriceFeed] = await Promise.all([
                refund.startBlock(),
                refund.endBlock(),
                refund.controller(),
                refund.ETHUSDPriceFeed()
            ]);

            expect(startBlock).to.be.equal(refund_startBlock);
            expect(endBlock).to.be.equal(refund_endBlock);
            expect(contractController).to.be.equal(controller);
            expect(contractETHUSDPriceFeed).to.be.equal(ETHUSDPriceFeed);
        });

        it('check init data', async () => {
            await expect(
                Refund.deploy(
                    '0',
                    refund_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.refundConstructorBlockNumIs0);

            await expect(
                Refund.deploy(
                    refund_startBlock,
                    '0',
                    controller,
                    ETHUSDPriceFeed,
                )
            ).to.be.revertedWith(revertMessages.refundConstructorBlockNumIs0);

            await expect(
                Refund.deploy(
                    '200',
                    '100',
                    controller,
                    ETHUSDPriceFeed,
                )
            ).to.be.revertedWith(revertMessages.refundConstructorStartBlockMustBeMoreThanCurrentBlockAndMoreThanEndBlock);

            await expect(
                Refund.deploy(
                    refund_startBlock,
                    refund_endBlock,
                    ethers.constants.AddressZero,
                    ETHUSDPriceFeed,
                )
            ).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Refund.deploy(
                    refund_startBlock,
                    refund_endBlock,
                    controller,
                    ethers.constants.AddressZero,
                )
            ).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Refund.deploy(
                    '1',
                    '100',
                    controller,
                    ETHUSDPriceFeed,
                )
            ).to.be.revertedWith(revertMessages.refundConstructorStartBlockMustBeMoreThanCurrentBlockAndMoreThanEndBlock);
        });
    });

    describe('Transactions', async () => {
        it('check data', async () => {
            // 1. deploy contract
            const blockNumBefore = await ethers.provider.getBlockNumber();

            refund_startBlock = +blockNumBefore + 90;
            refund_endBlock = +refund_startBlock + 100;

            refund = await Refund.deploy(
                refund_startBlock,
                refund_endBlock,
                controller,
                ETHUSDPriceFeed,
            );

            // 2. add token
            let amount = '1000000000000000000000000'; // 1000000e18
            const pToken1 = await MockPToken.deploy(
                amount,
                'pToken1',
                'pToken1'
            );

            const baseToken1 = await ERC20Token.deploy(
                amount,
                'baseToken1',
                'baseToken1'
            );

            const pToken2 = await MockPToken.deploy(
                amount,
                'pToken2',
                'pToken2'
            );

            const baseToken2 = await ERC20Token.deploy(
                amount,
                'baseToken2',
                'baseToken2'
            );

            const pToken3 = await MockPToken.deploy(
                amount,
                'pToken3',
                'pToken3'
            );

            const baseToken3 = await ERC20Token.deploy(
                amount,
                'baseToken3',
                'baseToken3'
            );

            let course1 = '20000000000000000'; // 2e16, 1 baseToken1 = 50 pToken1
            let course2 = '20408163000000000'; // 20408163e9, 1 baseToken2 = 49 pToken2
            let course3 = '19607843000000000'; // 19607843e9, 1 baseToken3 = 51 pToken3

            await expect(
                refund.connect(accounts[0]).addRefundPair(pToken1.address, baseToken1.address, course1)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await refund.addRefundPair(pToken1.address, baseToken1.address, course1);
            await refund.addRefundPair(pToken2.address, baseToken2.address, course2);
            await refund.addRefundPair(pToken3.address, baseToken3.address, course3);

            const [contractCourse1, contractCourse2, contractCourse3] = await Promise.all([
                refund.pTokens(pToken1.address),
                refund.pTokens(pToken2.address),
                refund.pTokens(pToken3.address),
            ]);

            expect(contractCourse1.course.toString()).to.be.equal(course1);
            expect(contractCourse2.course.toString()).to.be.equal(course2);
            expect(contractCourse3.course.toString()).to.be.equal(course3);

            // 3. add 3 token refund amount
            let baseTokenAmount1 = '100000000000000000000'; // 100e18
            let baseTokenAmount2 = '300000000000000000000'; // 300e18
            let baseTokenAmount3 = '700000000000000000000'; // 700e18

            await expect(
                refund.connect(accounts[0]).addTokensAndCheckpoint(baseToken1.address, baseTokenAmount1)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await baseToken1.approve(refund.address, baseTokenAmount1);

            const ownerBalanceBefore = await baseToken1.balanceOf(owner.address);
            const refundContractBalanceBefore = await baseToken1.balanceOf(refund.address);

            await refund.addTokensAndCheckpoint(baseToken1.address, baseTokenAmount1);

            const ownerBalanceAfter = await baseToken1.balanceOf(owner.address);
            const refundBalanceAfter = await baseToken1.balanceOf(refund.address);

            expect(ownerBalanceBefore.sub(ownerBalanceAfter).toString()).to.be.equal(baseTokenAmount1);
            expect(refundBalanceAfter.sub(refundContractBalanceBefore).toString()).to.be.equal(baseTokenAmount1);

            let checkpointLength = await refund.getCheckpointsLength(baseToken1.address);
            expect(checkpointLength).to.be.equal(1);

            let baseTokenCheckpoints = await refund.checkpoints(baseToken1.address, 0);
            expect(baseTokenCheckpoints.toString()).to.be.equal(baseTokenAmount1);

            await baseToken1.approve(refund.address, baseTokenAmount2);
            await refund.addTokensAndCheckpoint(baseToken1.address, baseTokenAmount2);

            checkpointLength = await refund.getCheckpointsLength(baseToken1.address);
            expect(checkpointLength).to.be.equal(2);

            baseTokenCheckpoints = await refund.checkpoints(baseToken1.address, 1);
            expect(baseTokenCheckpoints.toString()).to.be.equal(baseTokenAmount2);

            await baseToken1.approve(refund.address, baseTokenAmount3);
            await refund.addTokensAndCheckpoint(baseToken1.address, baseTokenAmount3);

            checkpointLength = await refund.getCheckpointsLength(baseToken1.address);
            expect(checkpointLength).to.be.equal(3);

            baseTokenCheckpoints = await refund.checkpoints(baseToken1.address, 2);
            expect(baseTokenCheckpoints.toString()).to.be.equal(baseTokenAmount3);

            // 4. 3 users call convert

            await mainMock.addPToken(pToken1.address);
            await mainMock.addPToken(pToken2.address);
            await mainMock.addPToken(pToken3.address);

            let acc0amount1 =  '950000000000000000000'; //  19e18 * 50
            let acc1amount1 = '1550000000000000000000'; //  31e18 * 50
            let acc2amount1 = '2500000000000000000000'; //  50e18 * 50

            let acc0amount2 = '2793000000000000000000'; //  57e18 * 49
            let acc1amount2 = '4557000000000000000000'; //  93e18 * 49
            let acc2amount2 = '7350000000000000000000'; // 150e18 * 49

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

            await pToken1.connect(accounts[0]).approve(refund.address, acc0amount1);
            await pToken1.connect(accounts[1]).approve(refund.address, acc1amount1);
            await pToken1.connect(accounts[2]).approve(refund.address, acc2amount1);

            await pToken2.connect(accounts[0]).approve(refund.address, acc0amount2);
            await pToken2.connect(accounts[1]).approve(refund.address, acc1amount2);
            await pToken2.connect(accounts[2]).approve(refund.address, acc2amount2);

            await pToken3.connect(accounts[0]).approve(refund.address, acc0amount3);
            await pToken3.connect(accounts[1]).approve(refund.address, acc1amount3);
            await pToken3.connect(accounts[2]).approve(refund.address, acc2amount3);

            // ==========
            // first pool
            // ==========

            const pToken1Acc0BalanceBefore = await pToken1.balanceOf(accounts[0].address);
            let pToken1RefundContractBalanceBefore = await pToken1.balanceOf(refund.address);

            await refund.connect(accounts[0]).refund(pToken1.address, acc0amount1);

            const pToken1Acc0BalanceAfter = await pToken1.balanceOf(accounts[0].address);
            let pToken1RefundBalanceAfter = await pToken1.balanceOf(refund.address);

            expect(pToken1Acc0BalanceBefore.sub(pToken1Acc0BalanceAfter).toString()).to.be.equal(acc0amount1);
            expect(pToken1RefundBalanceAfter.sub(pToken1RefundContractBalanceBefore).toString()).to.be.equal(acc0amount1);

            const pToken1Acc1BalanceBefore = await pToken1.balanceOf(accounts[1].address);
            pToken1RefundContractBalanceBefore = await pToken1.balanceOf(refund.address);

            await refund.connect(accounts[1]).refund(pToken1.address, acc1amount1);

            const pToken1Acc1BalanceAfter = await pToken1.balanceOf(accounts[1].address);
            pToken1RefundBalanceAfter = await pToken1.balanceOf(refund.address);

            expect(pToken1Acc1BalanceBefore.sub(pToken1Acc1BalanceAfter).toString()).to.be.equal(acc1amount1);
            expect(pToken1RefundBalanceAfter.sub(pToken1RefundContractBalanceBefore).toString()).to.be.equal(acc1amount1);

            const pToken1Acc2BalanceBefore = await pToken1.balanceOf(accounts[2].address);
            pToken1RefundContractBalanceBefore = await pToken1.balanceOf(refund.address);

            await refund.connect(accounts[2]).refund(pToken1.address, acc2amount1);

            const pToken1Acc2BalanceAfter = await pToken1.balanceOf(accounts[2].address);
            pToken1RefundBalanceAfter = await pToken1.balanceOf(refund.address);

            expect(pToken1Acc2BalanceBefore.sub(pToken1Acc2BalanceAfter).toString()).to.be.equal(acc2amount1);
            expect(pToken1RefundBalanceAfter.sub(pToken1RefundContractBalanceBefore).toString()).to.be.equal(acc2amount1);

            // ===========
            // second pool
            // ===========
            let pToken2RefundBalanceBefore = await pToken2.balanceOf(refund.address);

            await refund.connect(accounts[0]).refund(pToken2.address, acc0amount2);
            await refund.connect(accounts[1]).refund(pToken2.address, acc1amount2);

            await pToken2.setBorrowBalanceStored('1000000000');
            await mainMock.setUnderlyingPrice(pToken2.address, '1000000000000000000');

            await expect(
                refund.connect(accounts[2]).refund(pToken2.address, acc2amount2)
            ).to.be.revertedWith(revertMessages.refundRefundSumBorrowMustBeLessThan1);

            let pToken2RefundBalanceAfter = await pToken2.balanceOf(refund.address);
            let sum0 = new BigNumber(acc0amount2);
            let sum1 = new BigNumber(acc1amount2);

            expect(pToken2RefundBalanceAfter.sub(pToken2RefundBalanceBefore).toString()).to.be.equal(sum0.plus(sum1).toFixed());

            // 5. claimToken
            let amount1 = await refund.calcClaimAmount(accounts[0].address, pToken1.address);
            expect(amount1.toString()).to.be.equal('209000000000000000000');

            let amount2 = await refund.calcClaimAmount(accounts[1].address, pToken1.address);
            expect(amount2.toString()).to.be.equal('341000000000000000000');

            let amount3 = await refund.calcClaimAmount(accounts[2].address, pToken1.address);
            expect(amount3.toString()).to.be.equal('550000000000000000000');

            let currentBlockNumBefore = await ethers.provider.getBlockNumber();

            for (let i = 0; i < refund_startBlock - currentBlockNumBefore.toString(); i++) {
                await ethers.provider.send('evm_mine');
            }

            let baseToken1Acc0BalanceBefore = await baseToken1.balanceOf(accounts[0].address);
            let baseToken1RefundContractBalanceBefore = await baseToken1.balanceOf(refund.address);

            await refund.connect(accounts[0]).claimToken(pToken1.address);

            let baseToken1Acc0BalanceAfter = await baseToken1.balanceOf(accounts[0].address);
            let baseToken1RefundBalanceAfter = await baseToken1.balanceOf(refund.address);

            expect(baseToken1Acc0BalanceAfter.sub(baseToken1Acc0BalanceBefore).toString()).to.be.equal('209000000000000000000');
            expect(baseToken1RefundContractBalanceBefore.sub(baseToken1RefundBalanceAfter).toString()).to.be.equal('209000000000000000000');

            baseToken1Acc0BalanceBefore = await baseToken1.balanceOf(accounts[0].address);
            baseToken1RefundContractBalanceBefore = await baseToken1.balanceOf(refund.address);

            await refund.connect(accounts[0]).claimToken(pToken1.address);

            baseToken1Acc0BalanceAfter = await baseToken1.balanceOf(accounts[0].address);
            baseToken1RefundBalanceAfter = await baseToken1.balanceOf(refund.address);

            expect(baseToken1Acc0BalanceAfter.sub(baseToken1Acc0BalanceBefore).toString()).to.be.equal('0');
            expect(baseToken1RefundContractBalanceBefore.sub(baseToken1RefundBalanceAfter).toString()).to.be.equal('0');

            const baseToken1Acc1BalanceBefore = await baseToken1.balanceOf(accounts[1].address);
            baseToken1RefundContractBalanceBefore = await baseToken1.balanceOf(refund.address);

            await refund.connect(accounts[1]).claimToken(pToken1.address);

            const baseToken1Acc1BalanceAfter = await baseToken1.balanceOf(accounts[1].address);
            baseToken1RefundBalanceAfter = await baseToken1.balanceOf(refund.address);

            expect(baseToken1Acc1BalanceAfter.sub(baseToken1Acc1BalanceBefore).toString()).to.be.equal('341000000000000000000');
            expect(baseToken1RefundContractBalanceBefore.sub(baseToken1RefundBalanceAfter).toString()).to.be.equal('341000000000000000000');

            await expect(
                refund.connect(accounts[0]).addBlackList(accounts[2].address)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await refund.addBlackList(accounts[2].address);

            await expect(
                refund.connect(accounts[2]).claimToken(pToken1.address)
            ).to.be.revertedWith(revertMessages.refundClaimTokenUserInBlackList);

            // 6. remove unused tokens
            await expect(
                refund.connect(accounts[0]).removeUnused(baseToken1.address, '550000000000000000000')
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            currentBlockNumBefore = await ethers.provider.getBlockNumber();

            for (let i = 0; i < refund_endBlock - currentBlockNumBefore.toString() + 1; i++) {
                await ethers.provider.send('evm_mine');
            }

            const baseToken1OwnerBalanceBefore = await baseToken1.balanceOf(owner.address);
            baseToken1RefundContractBalanceBefore = await baseToken1.balanceOf(refund.address);

            await refund.removeUnused(baseToken1.address, '550000000000000000000');

            const baseToken1OwnerBalanceAfter = await baseToken1.balanceOf(owner.address);
            baseToken1RefundBalanceAfter = await baseToken1.balanceOf(refund.address);

            expect(baseToken1OwnerBalanceAfter.sub(baseToken1OwnerBalanceBefore).toString()).to.be.equal('550000000000000000000');
            expect(baseToken1RefundContractBalanceBefore.sub(baseToken1RefundBalanceAfter).toString()).to.be.equal('550000000000000000000');

            // 7. refund after
            await pToken1.transfer(accounts[0].address, acc0amount1);
            await pToken1.connect(accounts[0]).approve(refund.address, acc0amount1);

            for (let i = 0; i < 100; i++) {
                await ethers.provider.send('evm_mine');
            }

            await expect(
                refund.refund(pToken1.address, acc0amount1)
            ).to.be.revertedWith(revertMessages.refundRefundYouCanConvertPTokensBeforeStartBlockOnly);
        });

        it('calc refund amount', async () => {
            let amount = '1000000000000000000000000'; // 1000000e18
            const pToken1 = await MockPToken.deploy(amount,'pToken1','pToken1');
            const baseToken1 = await ERC20Token.deploy(amount,'baseToken1', 'baseToken1');

            let course1 = '20000000000000000'; // 2e16, 1 baseToken1 = 50 pToken1
            let course2 = '20408163265306122'; // 20408163e9, 1 baseToken2 = 49 pToken2
            let course3 = '19607843137254902'; // 19607843e9, 1 baseToken3 = 51 pToken3

            await refund.addRefundPair(pToken1.address, baseToken1.address, course1);
            let amount1 = await refund.calcRefundAmount(pToken1.address, '500000000000000000000');
            expect(amount1.toString()).to.be.equal('10000000000000000000');

            await refund.addRefundPair(pToken1.address, baseToken1.address, course2);
            let amount2 = await refund.calcRefundAmount(pToken1.address, '490000000000000000000');
            expect(amount2.toString()).to.be.equal('9999999999999999780');

            await refund.addRefundPair(pToken1.address, baseToken1.address, course3);
            let amount3 = await refund.calcRefundAmount(pToken1.address, '510000000000000000000');
            expect(amount3.toString()).to.be.equal('10000000000000000020');
        });
    });
});
