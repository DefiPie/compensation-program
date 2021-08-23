const { expect } = require("chai");
const { ethers } = require('hardhat');

describe("Compensation", function () {
    let compensation, Compensation;

    let controller;
    let ETHUSDPriceFeed;

    let compensation_stableCoin;
    let compensation_startBlock = '10';
    let compensation_endBlock = '100';

    let owner;

    beforeEach(async () => {
        const Mock = await hre.ethers.getContractFactory("Mock");
        const mock = await Mock.deploy();
        console.log("Mock deployed to:", mock.address);

        controller = mock.address;
        ETHUSDPriceFeed = mock.address;

        const ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        let amount = '100000000000000000000';
        const stable = await ERC20Token.deploy(
            amount,
            'USDT',
            'USDT'
        );
        console.log("Stable deployed to:", stable.address);

        compensation_stableCoin = stable.address;
        [owner] = await ethers.getSigners();

        Compensation = await hre.ethers.getContractFactory("Compensation");

        compensation = await Compensation.deploy(
            compensation_stableCoin,
            compensation_startBlock,
            compensation_endBlock,
            controller,
            ETHUSDPriceFeed,
        );
        console.log("Compensation deployed to:", compensation.address);
    });

    describe('Transactions', async () => {
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
    });
});
