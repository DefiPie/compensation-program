const { expect } = require("chai");
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');

describe("Convert", function () {
    let convert, Convert;
    let mainMock, MainMock, ERC20Token, MockPToken;
    let tokenTo, pToken;

    let controller;
    let ETHUSDPriceFeed;

    let convert_pTokenFrom;
    let convert_tokenTo;
    let convert_course = '20000000000000000'; // 0.02e18
    let convert_startBlock = '10';
    let convert_endBlock = '100';

    let owner, accounts;

    before(async () => {
        MainMock = await hre.ethers.getContractFactory("MainMock");
        ERC20Token = await hre.ethers.getContractFactory("ERC20Token");
        MockPToken = await hre.ethers.getContractFactory("MockPToken");
        Convert = await hre.ethers.getContractFactory("Convert");

        [owner, ...accounts] = await ethers.getSigners();
    });

    beforeEach(async () => {
        mainMock = await MainMock.deploy();
        console.log("MainMock deployed to:", mainMock.address);

        controller = mainMock.address;
        ETHUSDPriceFeed = mainMock.address;

        let amount = '100000000000000000000000'; //100,000e18
        pToken = await MockPToken.deploy(
            amount,
            'pToken1',
            'pToken1'
        );
        console.log("PToken deployed to:", pToken.address);

        convert_pTokenFrom = pToken.address;

        amount = '100000000000000000000000'; //100,000e18
        tokenTo = await ERC20Token.deploy(
            amount,
            'tokenTo',
            'tokenTo'
        );
        console.log("TokenTo deployed to:", tokenTo.address);

        convert_tokenTo = tokenTo.address;

        let currentBlockNumBefore = await ethers.provider.getBlockNumber();
        convert_startBlock = 10 + currentBlockNumBefore;
        convert_endBlock = 100 + currentBlockNumBefore;

        convert = await Convert.deploy(
            convert_pTokenFrom,
            convert_tokenTo,
            convert_course,
            convert_startBlock,
            convert_endBlock,
            controller,
            ETHUSDPriceFeed,
        );
        console.log("Convert deployed to:", convert.address);
    });

    describe('Constructor', async () => {
        it('check deploy data', async () => {
            const [pTokenFrom, tokenTo, course, startBlock, endBlock, contractController, contractETHUSDPriceFeed] = await Promise.all([
                convert.pTokenFrom(),
                convert.tokenTo(),
                convert.course(),
                convert.startBlock(),
                convert.endBlock(),
                convert.controller(),
                convert.ETHUSDPriceFeed()
            ]);

            expect(pTokenFrom).to.be.equal(convert_pTokenFrom);
            expect(tokenTo).to.be.equal(convert_tokenTo);
            expect(course).to.be.equal(convert_course);
            expect(startBlock).to.be.equal(convert_startBlock);
            expect(endBlock).to.be.equal(convert_endBlock);
            expect(contractController).to.be.equal(controller);
            expect(contractETHUSDPriceFeed).to.be.equal(ETHUSDPriceFeed);
        });

        it('check init data', async () => {
            await expect(
                Convert.deploy(
                    ethers.constants.AddressZero,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    ethers.constants.AddressZero,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    ethers.constants.AddressZero,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ethers.constants.AddressZero,
                )).to.be.revertedWith(revertMessages.serviceConstructorAddressIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    '0',
                    convert_startBlock,
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorNumIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    '0',
                    convert_endBlock,
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorNumIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    convert_startBlock,
                    '0',
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorNumIs0);

            await expect(
                Convert.deploy(
                    convert_pTokenFrom,
                    convert_tokenTo,
                    convert_course,
                    '1000',
                    '100',
                    controller,
                    ETHUSDPriceFeed,
                )).to.be.revertedWith(revertMessages.convertConstructorStartBlockIsMoreThanCurrentBlockAndMoreThanEndBlock);
        });
    });

    describe('Transactions', async () => {
        it('check data', async () => {
            // 1. deploy contract
            let blockNumBefore = await ethers.provider.getBlockNumber();
            convert_startBlock = +blockNumBefore + 90;
            convert_endBlock = +convert_startBlock + 100;

            convert = await Convert.deploy(
                convert_pTokenFrom,
                convert_tokenTo,
                convert_course,
                convert_startBlock,
                convert_endBlock,
                controller,
                ETHUSDPriceFeed,
            );
            console.log("Convert deployed to:", convert.address);

            // 2. add 3 checkpoint
            let amount1 = '150000000000000000000'; // 150e18
            let amount2 = '350000000000000000000'; // 350e18
            let amount3 = '500000000000000000000'; // 500e18

            let fromBlockFirstCheckpoint = +convert_startBlock + 1;
            let toBlockFirstCheckpoint = +fromBlockFirstCheckpoint + 10;
            let percentFirstCheckpoint = '1000000000000000000'; // 1%

            await expect(
                convert.connect(accounts[0]).addCheckpointAndTokensAmount(fromBlockFirstCheckpoint, toBlockFirstCheckpoint, percentFirstCheckpoint, amount1)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await tokenTo.approve(convert.address, amount1);

            const ownerBalanceBefore = await tokenTo.balanceOf(owner.address);
            const convertContractBalanceBefore = await tokenTo.balanceOf(convert.address);

            await convert.addCheckpointAndTokensAmount(fromBlockFirstCheckpoint, toBlockFirstCheckpoint, percentFirstCheckpoint, amount1);

            const ownerBalanceAfter = await tokenTo.balanceOf(owner.address);
            const convertBalanceAfter = await tokenTo.balanceOf(convert.address);

            expect(ownerBalanceBefore.sub(ownerBalanceAfter).toString()).to.be.equal(amount1);
            expect(convertBalanceAfter.sub(convertContractBalanceBefore).toString()).to.be.equal(amount1);

            let checkpointLength = await convert.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(1);

            let firstCheckpoint = await convert.checkpoints(0);
            expect(firstCheckpoint.fromBlock).to.be.equal(fromBlockFirstCheckpoint);
            expect(firstCheckpoint.toBlock).to.be.equal(toBlockFirstCheckpoint);
            expect(firstCheckpoint.percent.toString()).to.be.equal(percentFirstCheckpoint);

            let fromBlockSecondCheckpoint = +toBlockFirstCheckpoint + 1;
            let toBlockSecondCheckpoint = +fromBlockSecondCheckpoint + 15;
            let percentSecondCheckpoint = '12000000000000000000'; // 12%

            await tokenTo.approve(convert.address, amount2);
            await convert.addCheckpointAndTokensAmount(fromBlockSecondCheckpoint, toBlockSecondCheckpoint, percentSecondCheckpoint, amount2);

            checkpointLength = await convert.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(2);

            let secondCheckpoint = await convert.checkpoints(1);

            expect(secondCheckpoint.fromBlock).to.be.equal(fromBlockSecondCheckpoint);
            expect(secondCheckpoint.toBlock).to.be.equal(toBlockSecondCheckpoint);
            expect(secondCheckpoint.percent.toString()).to.be.equal(percentSecondCheckpoint);

            let fromBlockThirdCheckpoint = +toBlockSecondCheckpoint + 10;
            let toBlockThirdCheckpoint = +fromBlockThirdCheckpoint + 25;
            let percentThirdCheckpoint = '87000000000000000000'; // 87%

            await tokenTo.approve(convert.address, amount3);
            await convert.addCheckpointAndTokensAmount(fromBlockThirdCheckpoint, toBlockThirdCheckpoint, percentThirdCheckpoint, amount3);

            checkpointLength = await convert.getCheckpointsLength();
            expect(checkpointLength).to.be.equal(3);

            let thirdCheckpoint = await convert.checkpoints(2);

            expect(thirdCheckpoint.fromBlock).to.be.equal(fromBlockThirdCheckpoint);
            expect(thirdCheckpoint.toBlock).to.be.equal(toBlockThirdCheckpoint);
            expect(thirdCheckpoint.percent.toString()).to.be.equal(percentThirdCheckpoint);

            let fromBlockFourthCheckpoint = +toBlockThirdCheckpoint + 10;
            let toBlockFourthCheckpoint = +fromBlockFourthCheckpoint + 25;
            let percentFourthCheckpoint = '77000000000000000000'; // 77%

            let amount4 = '1';
            await tokenTo.approve(convert.address, amount4);

            await expect(
                convert.addCheckpointAndTokensAmount(toBlockThirdCheckpoint, toBlockFourthCheckpoint, percentFourthCheckpoint, amount4)
            ).to.be.revertedWith(revertMessages.convertAddCheckpointBlockValueMustBeMoreThanPreviousLastBlockValue);

            await expect(
                convert.addCheckpointAndTokensAmount(+convert_startBlock - 1, toBlockFourthCheckpoint, percentFourthCheckpoint, amount4)
            ).to.be.revertedWith(revertMessages.convertAddCheckpointStartBlockValueMustBeLessThanFromBlockValue);

            let blockNum = await ethers.provider.getBlockNumber();

            await expect(
                convert.addCheckpointAndTokensAmount(blockNum, toBlockFourthCheckpoint, percentFourthCheckpoint, amount4)
            ).to.be.revertedWith(revertMessages.convertAddCheckpointCurrentBlockValueMustBeLessThanFromBlockValue);

            await expect(
                convert.addCheckpointAndTokensAmount(fromBlockFourthCheckpoint, '1', percentFourthCheckpoint, amount4)
            ).to.be.revertedWith(revertMessages.convertAddCheckpointFromBlockValueMustBeLessThanToBlockValue);

            await expect(
                convert.addCheckpointAndTokensAmount(fromBlockFourthCheckpoint, '1000', percentFourthCheckpoint, amount4)
            ).to.be.revertedWith(revertMessages.convertAddCheckpointToBlockValueMustBeLessThanEndBlock);

            await expect(
                convert.addCheckpointAndTokensAmount(fromBlockFourthCheckpoint, toBlockFourthCheckpoint, '0', amount4)
            ).to.be.revertedWith(revertMessages.convertAddCheckpointPercentValueMustBeMoreThan0);

            // 3. 3 users call convert
            await mainMock.addPToken(pToken.address);

            let acc0amount =  '6783000000000000000000'; // 135,66e18 * 50
            let acc1amount = '11067000000000000000000'; // 221,34e18 * 50
            let acc2amount = '17850000000000000000000'; // 357e18 * 50

            await pToken.transfer(accounts[0].address, acc0amount);
            await pToken.transfer(accounts[1].address, acc1amount);
            await pToken.transfer(accounts[2].address, acc2amount);

            await pToken.connect(accounts[0]).approve(convert.address, acc0amount);
            await pToken.connect(accounts[1]).approve(convert.address, acc1amount);
            await pToken.connect(accounts[2]).approve(convert.address, acc2amount);

            let pTokenAcc0BalanceBefore = await pToken.balanceOf(accounts[0].address);
            let pTokenConvertContractBalanceBefore = await pToken.balanceOf(convert.address);

            await convert.connect(accounts[0]).convert(acc0amount);

            let pTokenAcc0BalanceAfter = await pToken.balanceOf(accounts[0].address);
            let pTokenConvertBalanceAfter = await pToken.balanceOf(convert.address);

            expect(pTokenAcc0BalanceBefore.sub(pTokenAcc0BalanceAfter).toString()).to.be.equal(acc0amount);
            expect(pTokenConvertBalanceAfter.sub(pTokenConvertContractBalanceBefore).toString()).to.be.equal(acc0amount);

            const pTokenAcc1BalanceBefore = await pToken.balanceOf(accounts[1].address);
            pTokenConvertContractBalanceBefore = await pToken.balanceOf(convert.address);

            await convert.connect(accounts[1]).convert(acc1amount);

            const pTokenAcc1BalanceAfter = await pToken.balanceOf(accounts[1].address);
            pTokenConvertBalanceAfter = await pToken.balanceOf(convert.address);

            expect(pTokenAcc1BalanceBefore.sub(pTokenAcc1BalanceAfter).toString()).to.be.equal(acc1amount);
            expect(pTokenConvertBalanceAfter.sub(pTokenConvertContractBalanceBefore).toString()).to.be.equal(acc1amount);

            const pTokenAcc2BalanceBefore = await pToken.balanceOf(accounts[2].address);
            pTokenConvertContractBalanceBefore = await pToken.balanceOf(convert.address);

            await convert.connect(accounts[2]).convert(acc2amount);

            const pTokenAcc2BalanceAfter = await pToken.balanceOf(accounts[2].address);
            pTokenConvertBalanceAfter = await pToken.balanceOf(convert.address);

            expect(pTokenAcc2BalanceBefore.sub(pTokenAcc2BalanceAfter).toString()).to.be.equal(acc2amount);
            expect(pTokenConvertBalanceAfter.sub(pTokenConvertContractBalanceBefore).toString()).to.be.equal(acc2amount);

            let acc4amount = '150000000000000000000'; // 350e18 * 51

            await pToken.transfer(accounts[4].address, acc4amount);
            await pToken.connect(accounts[4]).approve(convert.address, acc4amount);

            let pTokenConvertBalanceBefore = await pToken.balanceOf(convert.address);
            let pTokenAcc4BalanceBefore = await pToken.balanceOf(accounts[4].address);

            await pToken.setBorrowBalanceStored('1000000000');
            await mainMock.setUnderlyingPrice(pToken.address, '1000000000000000000');

            await expect(
                convert.connect(accounts[4]).convert(acc4amount)
            ).to.be.revertedWith(revertMessages.convertConvertSumBorrowMustBeLessThan1);

            pTokenConvertBalanceAfter = await pToken.balanceOf(convert.address);
            expect(pTokenConvertBalanceAfter.sub(pTokenConvertBalanceBefore).toString()).to.be.equal('0');

            let pTokenAcc4BalanceAfter = await pToken.balanceOf(accounts[4].address);
            expect(pTokenAcc4BalanceAfter.sub(pTokenAcc4BalanceBefore).toString()).to.be.equal('0');

            await expect(
                convert.connect(accounts[0]).claimToken()
            ).to.be.revertedWith(revertMessages.convertClaimTokenBadTimingForRequest);

            blockNumBefore = await ethers.provider.getBlockNumber();

            for (let i = 0; i < convert_startBlock - blockNumBefore.toString() + 1; i++) {
                await ethers.provider.send('evm_mine');
            }

            await pToken.setBorrowBalanceStored('0');

            await expect(
                convert.connect(accounts[4]).convert(acc4amount)
            ).to.be.revertedWith(revertMessages.convertConvertYouCanConvertPTokensBeforeStartBlockOnly);

            // 4. claimToken
            let convertAmount1 = await convert.calcConvertAmount(acc0amount);
            expect(convertAmount1.toString()).to.be.equal('135660000000000000000');

            // amount * percent * (current block - from block) / all blocks
            // 135,66e18 * 1% * (105 - 103) / 10 = 0.27132e18
            let claimAmount1 = await convert.calcClaimAmount(accounts[0].address);
            expect(claimAmount1.toString()).to.be.equal('271320000000000000');

            let claimAmount2 = await convert.calcClaimAmount(accounts[1].address);
            expect(claimAmount2.toString()).to.be.equal('442680000000000000');

            let claimAmount3 = await convert.calcClaimAmount(accounts[2].address);
            expect(claimAmount3.toString()).to.be.equal('714000000000000000');

            let tokenToAcc0BalanceBefore = await tokenTo.balanceOf(accounts[0].address);
            let tokenToConvertContractBalanceBefore = await tokenTo.balanceOf(convert.address);

            await convert.connect(accounts[0]).claimToken();

            let tokenToAcc0BalanceAfter = await tokenTo.balanceOf(accounts[0].address);
            let tokenToConvertBalanceAfter = await tokenTo.balanceOf(convert.address);

            // 135,66e18 * 1% * (106 - 103) / 10 = 0.40698e18
            expect(tokenToAcc0BalanceAfter.sub(tokenToAcc0BalanceBefore).toString()).to.be.equal('406980000000000000');
            expect(tokenToConvertContractBalanceBefore.sub(tokenToConvertBalanceAfter).toString()).to.be.equal('406980000000000000');

            claimAmount1 = await convert.calcClaimAmount(accounts[0].address);
            expect(claimAmount1.toString()).to.be.equal('0');

            claimAmount2 = await convert.calcClaimAmount(accounts[1].address);
            expect(claimAmount2.toString()).to.be.equal('664020000000000000');

            claimAmount3 = await convert.calcClaimAmount(accounts[2].address);
            expect(claimAmount3.toString()).to.be.equal('1071000000000000000');

            let currentBlockNum = await ethers.provider.getBlockNumber();

            for (let i = 0; i < fromBlockSecondCheckpoint - currentBlockNum.toString(); i++) {
                await ethers.provider.send('evm_mine');
            }

            claimAmount1 = await convert.calcClaimAmount(accounts[0].address);
            expect(claimAmount1.toString()).to.be.equal('949620000000000000');

            claimAmount2 = await convert.calcClaimAmount(accounts[1].address);
            expect(claimAmount2.toString()).to.be.equal('2213400000000000000');

            claimAmount3 = await convert.calcClaimAmount(accounts[2].address);
            expect(claimAmount3.toString()).to.be.equal('3570000000000000000');

            currentBlockNum = await ethers.provider.getBlockNumber();

            for (let i = 0; i < toBlockSecondCheckpoint - currentBlockNum.toString(); i++) {
                await ethers.provider.send('evm_mine');
            }

            // result = amount * percent * (current block - from block) / all blocks - out
            // result = 135,66e18 * 1% * (113 - 103) / 10 - 406980000000000000 = 1,3566e18 - 0,40698e18
            // + result = 135,66e18 * 12% * (129 - 114) / 15 = 16,2792e18
            claimAmount1 = await convert.calcClaimAmount(accounts[0].address);
            expect(claimAmount1.toString()).to.be.equal('17228820000000000000');

            // result = 221,34e18 * 1% * (113 - 103) / 10 = 2,2134e18
            // + result = 221,34e18 * 12% * (129 - 114) / 15 = 26,5608e18
            claimAmount2 = await convert.calcClaimAmount(accounts[1].address);
            expect(claimAmount2.toString()).to.be.equal('28774200000000000000');

            claimAmount3 = await convert.calcClaimAmount(accounts[2].address);
            expect(claimAmount3.toString()).to.be.equal('46410000000000000000');

            let tokenToAcc1BalanceBefore = await tokenTo.balanceOf(accounts[1].address);
            tokenToConvertContractBalanceBefore = await tokenTo.balanceOf(convert.address);

            await convert.connect(accounts[1]).claimToken();

            let tokenToAcc1BalanceAfter = await tokenTo.balanceOf(accounts[1].address);
            tokenToConvertBalanceAfter = await tokenTo.balanceOf(convert.address);

            expect(tokenToAcc1BalanceAfter.sub(tokenToAcc1BalanceBefore).toString()).to.be.equal('28774200000000000000');
            expect(tokenToConvertContractBalanceBefore.sub(tokenToConvertBalanceAfter).toString()).to.be.equal('28774200000000000000');

            currentBlockNum = await ethers.provider.getBlockNumber();

            for (let i = 0; i < toBlockThirdCheckpoint - currentBlockNum.toString() + 1; i++) {
                await ethers.provider.send('evm_mine');
            }

            // result = amount * percent * (current block - from block) / all blocks - out
            // result = 135,66e18 * 1% * (113 - 103) / 10 - 406980000000000000 = 1,3566e18 - 0,40698e18
            // + result = 135,66e18 * 12% * (129 - 114) / 15 =  16,2792e18
            // + result = 135,66e18 * 87% * (164 - 139) / 25 = 118,0242e18
            claimAmount1 = await convert.calcClaimAmount(accounts[0].address);
            expect(claimAmount1.toString()).to.be.equal('135253020000000000000');

            // result = 221,34e18 * 1% * (113 - 103) / 10 = 2,2134e18
            // + result = 221,34e18 * 12% * (129 - 114) / 15 = 26,5608e18 - 28,7742e18
            // + result = 221,34e18 * 87% * (164 - 139) / 25 = 192,5658e18
            claimAmount2 = await convert.calcClaimAmount(accounts[1].address);
            expect(claimAmount2.toString()).to.be.equal('192565800000000000000');

            claimAmount3 = await convert.calcClaimAmount(accounts[2].address);
            expect(claimAmount3.toString()).to.be.equal('357000000000000000000');

            tokenToAcc0BalanceBefore = await tokenTo.balanceOf(accounts[0].address);
            tokenToConvertContractBalanceBefore = await tokenTo.balanceOf(convert.address);

            await convert.connect(accounts[0]).claimToken();

            tokenToAcc0BalanceAfter = await tokenTo.balanceOf(accounts[0].address);
            tokenToConvertBalanceAfter = await tokenTo.balanceOf(convert.address);

            // 135,66e18 * 1% * (106 - 103) / 10 = 0.40698e18
            expect(tokenToAcc0BalanceAfter.sub(tokenToAcc0BalanceBefore).toString()).to.be.equal('135253020000000000000');
            expect(tokenToConvertContractBalanceBefore.sub(tokenToConvertBalanceAfter).toString()).to.be.equal('135253020000000000000');

            tokenToAcc1BalanceBefore = await tokenTo.balanceOf(accounts[1].address);
            tokenToConvertContractBalanceBefore = await tokenTo.balanceOf(convert.address);

            await convert.connect(accounts[1]).claimToken();

            tokenToAcc1BalanceAfter = await tokenTo.balanceOf(accounts[1].address);
            tokenToConvertBalanceAfter = await tokenTo.balanceOf(convert.address);

            expect(tokenToAcc1BalanceAfter.sub(tokenToAcc1BalanceBefore).toString()).to.be.equal('192565800000000000000');
            expect(tokenToConvertContractBalanceBefore.sub(tokenToConvertBalanceAfter).toString()).to.be.equal('192565800000000000000');

            await expect(
                convert.connect(accounts[0]).addBlackList(accounts[2].address)
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            await convert.addBlackList(accounts[2].address);

            await expect(
                convert.connect(accounts[2]).claimToken()
            ).to.be.revertedWith(revertMessages.convertClaimTokenUserInBlackList);

            // 5. remove unused tokens
            await expect(
                convert.connect(accounts[0]).removeUnusedToken('643000000000000000000')
            ).to.be.revertedWith(revertMessages.ownableCallerIsNotOwner);

            let currentBlockNumBefore = await ethers.provider.getBlockNumber();

            for (let i = 0; i < convert_endBlock - currentBlockNumBefore.toString() + 1; i++) {
                await ethers.provider.send('evm_mine');
            }

            const tokenToOwnerBalanceBefore = await tokenTo.balanceOf(owner.address);
            tokenToConvertContractBalanceBefore = await tokenTo.balanceOf(convert.address);

            await convert.removeUnusedToken('643000000000000000000');

            const tokenToOwnerBalanceAfter = await tokenTo.balanceOf(owner.address);
            tokenToConvertBalanceAfter = await tokenTo.balanceOf(convert.address);

            expect(tokenToOwnerBalanceAfter.sub(tokenToOwnerBalanceBefore).toString()).to.be.equal('643000000000000000000');
            expect(tokenToConvertContractBalanceBefore.sub(tokenToConvertBalanceAfter).toString()).to.be.equal('643000000000000000000');
        });
    });
});
