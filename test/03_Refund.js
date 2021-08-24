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
            // 3. add 3 checkpoint
            // 4. 3 users call convert
            // 5. claimToken
            // 6. remove unused tokens
        });
    });
});
