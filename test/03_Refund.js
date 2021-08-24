const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');

describe("Refund", function () {
    let refund, Refund;
    let mock, Mock, ERC20Token;

    let controller;
    let ETHUSDPriceFeed;

    let refund_startBlock = '10';
    let refund_endBlock = '100';

    let owner, accounts;

    before(async () => {
        Mock = await hre.ethers.getContractFactory("Mock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        Refund = await hre.ethers.getContractFactory("Refund");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mock = await Mock.deploy();
        console.log("Mock deployed to:", mock.address);

        controller = mock.address;
        ETHUSDPriceFeed = mock.address;

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

            refund_startBlock = +blockNumBefore + 10;
            refund_endBlock = +refund_startBlock + 100;

            refund = await Refund.deploy(
                refund_startBlock,
                refund_endBlock,
                controller,
                ETHUSDPriceFeed,
            );

            // 2. add token
            let amount = '100000000000000000000';
            const pToken1 = await ERC20Token.deploy(
                amount,
                'pToken1',
                'pToken1'
            );

            const baseToken1 = await ERC20Token.deploy(
                amount,
                'baseToken1',
                'baseToken1'
            );

            const pToken2 = await ERC20Token.deploy(
                amount,
                'pToken2',
                'pToken2'
            );

            const baseToken2 = await ERC20Token.deploy(
                amount,
                'baseToken2',
                'baseToken2'
            );

            const pToken3 = await ERC20Token.deploy(
                amount,
                'pToken3',
                'pToken3'
            );

            const baseToken3 = await ERC20Token.deploy(
                amount,
                'baseToken3',
                'baseToken3'
            );

            let course1 = '20000000000000000'; // 2e16, 1 baseToken = 50 pToken
            let course2 = '20408163000000000'; // 20408163e9, 1 baseToken = 49 pToken
            let course3 = '19607843000000000'; // 19607843e9, 1 baseToken = 51 pToken

            await expect(
                refund.connect(accounts[0]).addRefundPair(pToken1.address, baseToken1.address, course1)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await refund.addRefundPair(pToken1.address, baseToken1.address, course1);
            await refund.addRefundPair(pToken2.address, baseToken2.address, course2);
            await refund.addRefundPair(pToken3.address, baseToken3.address, course3);

            const [contractCourse1, contractCourse2, contractCourse3] = await Promise.all([
                refund.pTokens(pToken1.address, baseToken1.address),
                refund.pTokens(pToken2.address, baseToken2.address),
                refund.pTokens(pToken3.address, baseToken3.address),
            ]);

            expect(contractCourse1).to.be.equal(course1);
            expect(contractCourse2).to.be.equal(course2);
            expect(contractCourse3).to.be.equal(course3);

            // 3. add 3 checkpoint
            // 4. 3 users call convert
            // 5. claimToken
            // 6. remove unused tokens
        });
    });
});
