const { expect } = require("chai");
const { ethers } = require('hardhat');

describe("Compensation", function () {
    let compensation, Compensation;
    let mock, Mock, ERC20Token;

    let controller;
    let ETHUSDPriceFeed;

    let compensation_stableCoin;
    let compensation_startBlock = '10';
    let compensation_endBlock = '100';

    let owner, accounts;

    before(async () => {
        Mock = await hre.ethers.getContractFactory("Mock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        Compensation = await hre.ethers.getContractFactory("Compensation");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mock = await Mock.deploy();
        console.log("Mock deployed to:", mock.address);

        controller = mock.address;
        ETHUSDPriceFeed = mock.address;

        let amount = '100000000000000000000';
        const stable = await ERC20Token.deploy(
            amount,
            'USDT',
            'USDT'
        );
        console.log("Stable deployed to:", stable.address);

        compensation_stableCoin = stable.address;

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
