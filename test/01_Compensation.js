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

    let reward_apy;
    let lastApyBlockTimestamp;

    let compensation_stableCoin;
    let compensation_startTimestamp;
    let compensation_endTimestamp;

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

        reward_apy = '250000000000000000'; // 25% - 25e16

        let amount = '1000000000000'; // 1,000,000e6
        stable = await ERC20Token.deploy(
            amount,
            'USDT',
            'USDT'
        );
        console.log("Stable deployed to:", stable.address);

        compensation_stableCoin = stable.address;

        let currentBlockTimestampBefore = await ethers.provider.getBlock();
        compensation_startTimestamp = 10 + currentBlockTimestampBefore.timestamp;
        compensation_endTimestamp = 700 + currentBlockTimestampBefore.timestamp;
        lastApyBlockTimestamp = 400 + currentBlockTimestampBefore.timestamp;

        compensation = await Compensation.deploy(
            compensation_stableCoin,
            compensation_startTimestamp,
            compensation_endTimestamp,
            controller,
            ETHUSDPriceFeed,
            reward_apy,
            lastApyBlockTimestamp
        );
        console.log("Compensation deployed to:", compensation.address);
    });

    describe('Constructor', async () => {
        it('check deploy data', async () => {
            const [stableCoin, startTimestamp, endTimestamp, contractController, contractETHUSDPriceFeed, rewardRatePerSec, lastApyBlockTimestampContract] = await Promise.all([
                compensation.stableCoin(),
                compensation.startTimestamp(),
                compensation.endTimestamp(),
                compensation.controller(),
                compensation.ETHUSDPriceFeed(),
                compensation.rewardRatePerSec(),
                compensation.lastApyTimestamp()
            ]);

            expect(stableCoin).to.be.equal(compensation_stableCoin);
            expect(startTimestamp).to.be.equal(compensation_startTimestamp);
            expect(endTimestamp).to.be.equal(compensation_endTimestamp);
            expect(contractController).to.be.equal(controller);
            expect(contractETHUSDPriceFeed).to.be.equal(ETHUSDPriceFeed);
            expect(rewardRatePerSec).to.be.equal('7927447995');
            expect(lastApyBlockTimestamp).to.be.equal(lastApyBlockTimestampContract);
        });

        it('check init data', async () => {
            await expect(
                Compensation.deploy(
                    ethers.constants.AddressZero,
                    compensation_startTimestamp,
                    compensation_endTimestamp,
                    controller,
                    ETHUSDPriceFeed,
                    reward_apy,
                    lastApyBlockTimestamp
                )).to.be.revertedWith(revertMessages.compensationConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startTimestamp,
                    compensation_endTimestamp,
                    controller,
                    ethers.constants.AddressZero,
                    reward_apy,
                    lastApyBlockTimestamp
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startTimestamp,
                    compensation_endTimestamp,
                    ethers.constants.AddressZero,
                    ETHUSDPriceFeed,
                    reward_apy,
                    lastApyBlockTimestamp
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    '0',
                    compensation_endTimestamp,
                    controller,
                    ETHUSDPriceFeed,
                    reward_apy,
                    lastApyBlockTimestamp
                )).to.be.revertedWith(revertMessages.compensationConstructorBlockTimestampIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    compensation_startTimestamp,
                    '0',
                    controller,
                    ETHUSDPriceFeed,
                    reward_apy,
                    lastApyBlockTimestamp
                )).to.be.revertedWith(revertMessages.compensationConstructorBlockTimestampIs0);

            await expect(
                Compensation.deploy(
                    compensation_stableCoin,
                    '200',
                    '100',
                    controller,
                    ETHUSDPriceFeed,
                    reward_apy,
                    lastApyBlockTimestamp
                )).to.be.revertedWith(revertMessages.compensationConstructorStartTimestampIsMoreThanCurrentTimestampAndMoreThanEndTimestamp);
        });
    });

    describe('Transactions', async () => {
        it('check data', async () => {
            // 1. deploy contract
            let block = await ethers.provider.getBlock();
            compensation_startTimestamp = +block.timestamp + 90;
            compensation_endTimestamp = +compensation_startTimestamp + 100;

            compensation = await Compensation.deploy(
                compensation_stableCoin,
                compensation_startTimestamp,
                compensation_endTimestamp,
                controller,
                ETHUSDPriceFeed,
                reward_apy,
                lastApyBlockTimestamp
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
                compensation.pTokenPrices(pToken1.address),
                compensation.pTokenPrices(pToken2.address),
                compensation.pTokenPrices(pToken3.address),
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
            //
            // await expect(
            //     compensation.connect(accounts[2]).compensation(pToken2.address, acc2amount2)
            // ).to.be.revertedWith(revertMessages.compensationCompensationSumBorrowMustBeLessThan1);
            //
            // let pToken2RefundBalanceAfter = await pToken2.balanceOf(compensation.address);
            // let sum0 = new BigNumber(acc0amount2);
            // let sum1 = new BigNumber(acc1amount2);
            //
            // expect(pToken2RefundBalanceAfter.sub(pToken2RefundBalanceBefore).toString()).to.be.equal(sum0.plus(sum1).toFixed());
            //
            // // 5. claim
            // let amount1 = await compensation.calcClaimAmount(accounts[0].address);
            // expect(amount1.toString()).to.be.equal('342000000'); // 1 pool - $57, 57 tokens with $1 price, 2 pool = $285, 19 tokens with $15 price
            //
            // let amount2 = await compensation.calcClaimAmount(accounts[1].address);
            // expect(amount2.toString()).to.be.equal('558000000'); // 1 pool - $93, 93 tokens with $1 price, 2 pool = $465, 31 tokens with $15 price
            //
            // let amount3 = await compensation.calcClaimAmount(accounts[2].address);
            // expect(amount3.toString()).to.be.equal('150000000');
            //
            // let currentBlockNumBefore = await ethers.provider.getBlockNumber();
            //
            // for (let i = 0; i < compensation_startTimestamp - currentBlockNumBefore.toString(); i++) {
            //     await ethers.provider.send('evm_mine');
            // }
            //
            // currentBlockNumBefore = await ethers.provider.getBlockNumber();
            //
            // let stableAcc0BalanceBefore = await stable.balanceOf(accounts[0].address);
            // let stableRefundContractBalanceBefore = await stable.balanceOf(compensation.address);
            //
            // await compensation.connect(accounts[0]).claimToken();
            //
            // let stableAcc0BalanceAfter = await stable.balanceOf(accounts[0].address);
            // let stableRefundBalanceAfter = await stable.balanceOf(compensation.address);
            //
            // let additionalAmount = '40'; // 1 block with apy, 1 * 342000000 * 0.25 / 2102400 = 40,6
            // expect(stableAcc0BalanceAfter.sub(stableAcc0BalanceBefore).toString()).to.be.equal('342000040');
            // expect(stableRefundContractBalanceBefore.sub(stableRefundBalanceAfter).toString()).to.be.equal('342000040');
            //
            // stableAcc0BalanceBefore = await stable.balanceOf(accounts[0].address);
            // stableRefundContractBalanceBefore = await stable.balanceOf(compensation.address);
            //
            // await compensation.connect(accounts[0]).claimToken();
            //
            // stableAcc0BalanceAfter = await stable.balanceOf(accounts[0].address);
            // stableRefundBalanceAfter = await stable.balanceOf(compensation.address);
            //
            // additionalAmount = '41'; // 2 block with apy = 2 * 342000000 * 0.25 / 2102400 = 81,2 - 40 (claimed)
            // expect(stableAcc0BalanceAfter.sub(stableAcc0BalanceBefore).toString()).to.be.equal('41');
            // expect(stableRefundContractBalanceBefore.sub(stableRefundBalanceAfter).toString()).to.be.equal('41');
            //
            // const stableAcc1BalanceBefore = await stable.balanceOf(accounts[1].address);
            // stableRefundContractBalanceBefore = await stable.balanceOf(compensation.address);
            //
            // await compensation.connect(accounts[1]).claimToken();
            //
            // const stableAcc1BalanceAfter = await stable.balanceOf(accounts[1].address);
            // stableRefundBalanceAfter = await stable.balanceOf(compensation.address);
            //
            // additionalAmount = '199'; // 3 block with apy = 3 * 558000000 * 0.25 / 2102400 = 199,05
            // expect(stableAcc1BalanceAfter.sub(stableAcc1BalanceBefore).toString()).to.be.equal('558000199');
            // expect(stableRefundContractBalanceBefore.sub(stableRefundBalanceAfter).toString()).to.be.equal('558000199');
            //
            // await expect(
            //     compensation.connect(accounts[0]).addBlackList(accounts[2].address)
            // ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);
            //
            // await compensation.addBlackList(accounts[2].address);
            //
            // await expect(
            //     compensation.connect(accounts[2]).claimToken()
            // ).to.be.revertedWith(revertMessages.compensationClaimTokenUserInBlackList);
            //
            // // 6. remove unused tokens
            // await expect(
            //     compensation.connect(accounts[0]).removeUnused(stable.address, '10100000000')
            // ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);
            //
            // currentBlockNumBefore = await ethers.provider.getBlockNumber();
            //
            // for (let i = 0; i < compensation_endTimestamp - currentBlockNumBefore.toString() + 1; i++) {
            //     await ethers.provider.send('evm_mine');
            // }
            //
            // const stableOwnerBalanceBefore = await stable.balanceOf(owner.address);
            // let stableCompensationContractBalanceBefore = await stable.balanceOf(compensation.address);
            //
            // additionalAmount = '280';
            // await compensation.removeUnused(stable.address, '10099999720');
            //
            // const stableOwnerBalanceAfter = await stable.balanceOf(owner.address);
            // let stableCompensationBalanceAfter = await stable.balanceOf(compensation.address);
            //
            // expect(stableOwnerBalanceAfter.sub(stableOwnerBalanceBefore).toString()).to.be.equal('10099999720');
            // expect(stableCompensationContractBalanceBefore.sub(stableCompensationBalanceAfter).toString()).to.be.equal('10099999720');
            //
            // // 7. compensation after
            // await pToken1.transfer(accounts[0].address, acc0amount1);
            // await pToken1.connect(accounts[0]).approve(compensation.address, acc0amount1);
            //
            // for (let i = 0; i < 100; i++) {
            //     await ethers.provider.send('evm_mine');
            // }
            //
            // await expect(
            //     compensation.compensation(pToken1.address, acc0amount1)
            // ).to.be.revertedWith(revertMessages.compensationCompensationYouCanConvertPTokensBeforeStartBlockOnly);
            //
            // currentBlockNumBefore = await ethers.provider.getBlockNumber();
            // expect(currentBlockNumBefore.toString()).to.be.equal('304');
            //
            // amount1 = await compensation.calcClaimAmount(accounts[0].address);
            // amount2 = await compensation.calcClaimAmount(accounts[1].address);
            // amount3 = await compensation.calcClaimAmount(accounts[2].address);
            //
            // // 205 block with apy, 205 * 342000000 * 0.25 / 2102400 = 8336,9 - 81 = 8255,9
            // expect(amount1).to.be.equal('8255');
            // // 205 block with apy, 205 * 558000000 * 0.25 / 2102400 = 13602,3 − 199 = 13403,3
            // expect(amount2).to.be.equal('13403');
            // // 205 block with apy, 205 * 150000000 * 0.25 / 2102400 = 3656,5 + claim amount = 150003656
            // expect(amount3).to.be.equal('150003656');
            //
            // for (let i = 0; i < lastApyBlock - currentBlockNumBefore - 1; i++) {
            //     await ethers.provider.send('evm_mine');
            // }
            //
            // currentBlockNumBefore = await ethers.provider.getBlockNumber();
            // expect(currentBlockNumBefore.toString()).to.be.equal('399');
            //
            // amount1 = await compensation.calcClaimAmount(accounts[0].address);
            // amount2 = await compensation.calcClaimAmount(accounts[1].address);
            // amount3 = await compensation.calcClaimAmount(accounts[2].address);
            //
            // // 300 block with apy, (399 - 99) * 342000000 * 0.25 / 2102400 = 12200 - 81 = 12119
            // expect(amount1).to.be.equal('12119');
            // // 300 block with apy, (399 - 99) * 558000000 * 0.25 / 2102400 = 19905 − 199 = 19706
            // expect(amount2).to.be.equal('19706');
            // // 300 block with apy, (399 - 99) * 150000000 * 0.25 / 2102400 = 5351 + claim amount = 150005351
            // expect(amount3).to.be.equal('150005351');
            //
            // for (let i = 0; i < 1; i++) {
            //     await ethers.provider.send('evm_mine');
            // }
            //
            // currentBlockNumBefore = await ethers.provider.getBlockNumber();
            // expect(currentBlockNumBefore.toString()).to.be.equal('400');
            //
            // amount1 = await compensation.calcClaimAmount(accounts[0].address);
            // amount2 = await compensation.calcClaimAmount(accounts[1].address);
            // amount3 = await compensation.calcClaimAmount(accounts[2].address);
            //
            // // 400 block with apy, (400 - 99) * 342000000 * 0.25 / 2102400 = 12241 - 81 = 12160
            // expect(amount1).to.be.equal('12160');
            // // 400 block with apy, (400 - 99) * 558000000 * 0.25 / 2102400 = 19972 - 199 = 19773
            // expect(amount2).to.be.equal('19773');
            // // 400 block with apy, (400 - 99) * 150000000 * 0.25 / 2102400 = 5368 + claim amount = 150005368
            // expect(amount3).to.be.equal('150005368');
            //
            // for (let i = 0; i < 1; i++) {
            //     await ethers.provider.send('evm_mine');
            // }
            //
            // currentBlockNumBefore = await ethers.provider.getBlockNumber();
            // expect(currentBlockNumBefore.toString()).to.be.equal('401');
            //
            // amount1 = await compensation.calcClaimAmount(accounts[0].address);
            // amount2 = await compensation.calcClaimAmount(accounts[1].address);
            // amount3 = await compensation.calcClaimAmount(accounts[2].address);
            //
            // // 401 block with apy (last apy block is 400), (400 - 99) * 342000000 * 0.25 / 2102400 = 12241 - 81 = 12160
            // expect(amount1).to.be.equal('12160');
            // // 401 block with apy (last apy block is 400), (400 - 99) * 558000000 * 0.25 / 2102400 = 19972 - 199 = 19773
            // expect(amount2).to.be.equal('19773');
            // // 401 block with apy (last apy block is 400), (400 - 99) * 150000000 * 0.25 / 2102400 = 5368 + claim amount = 150005368
            // expect(amount3).to.be.equal('150005368');
        });
    });

});
