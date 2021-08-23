const { expect } = require("chai");
const { ethers } = require('hardhat');

describe("Refund", function () {
    let refund, Refund;
    let mock, Mock, ERC20Token;

    let controller;
    let ETHUSDPriceFeed;

    let refund_startBlock = '10';
    let refund_endBlock = '100';

    let owner;

    before(async () => {
        Mock = await hre.ethers.getContractFactory("Mock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        Refund = await hre.ethers.getContractFactory("Refund");

        [owner] = await ethers.getSigners();
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

    describe('Transactions', async () => {
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
    });
});
