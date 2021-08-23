//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Services/ERC20.sol";
import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Convert is Service, BlackList {
    address public pTokenFrom;
    address public tokenTo;

    uint public course;
    uint public startBlock;
    uint public endBlock;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => Balance) public balances;

    struct Checkpoint {
        uint fromBlock;
        uint toBlock;
        uint value; // for example 10e18 is 10%
    }

    // num => block => value
    Checkpoint[] public checkpoints;

    constructor(
        address pTokenFrom_,
        address tokenTo_,
        uint course_,
        uint startBlock_,
        uint endBlock_,
        address controller_,
        address ETHUSDPriceFeed_
    ) Service(controller_, ETHUSDPriceFeed_) {
        require(
            pTokenFrom_ != address(0)
            && tokenTo_ != address(0)
            && controller_ != address(0)
            && ETHUSDPriceFeed_ != address(0),
            "Convert::Constructor: address is 0"
        );

        require(
            course_ != 0
            && startBlock_ != 0
            && endBlock_ != 0,
            "Convert::Constructor: num is 0"
        );

        pTokenFrom = pTokenFrom_;
        tokenTo = tokenTo_;

        controller = controller_;
        ETHUSDPriceFeed = ETHUSDPriceFeed_;

        course = course_;
        startBlock = startBlock_;
        endBlock = endBlock_;
    }

    function addTokenAmount(uint amount) public onlyOwner returns (bool) {
        doTransferIn(msg.sender, tokenTo, amount);

        return true;
    }

    function removeUnusedToken(uint amount) public onlyOwner returns (bool) {
        require(endBlock > block.number, "Convert::removeUnusedToken: bad timing for the request");

        doTransferOut(tokenTo, msg.sender, amount);

        return true;
    }

    function addCheckpoint(uint fromBlock_, uint toBlock_, uint value_) public onlyOwner returns (bool) {
        require(block.number < fromBlock_, "Convert::addCheckpoint: block value must be more than current block");
        require(startBlock < fromBlock_, "Convert::addCheckpoint: block value must be more than current block");
        require(toBlock_ < endBlock, "Convert::addCheckpoint: block value toBlock must be less than end block");

        uint length = uint(checkpoints.length);
        if (length > 0) {
            require(checkpoints[length - 1].toBlock < fromBlock_, "Convert::addCheckpoint: block value must be more than previous last block value");
        }

        Checkpoint memory cp;
        cp.fromBlock = fromBlock_;
        cp.toBlock = toBlock_;
        cp.value = value_;

        checkpoints.push(cp);

        return true;
    }

    function convert(uint pTokenFromAmount) public returns (bool) {
        require(block.number < startBlock, "Convert::convert: you can convert pTokens before first checkpoint block num only");
        require(checkBorrowBalance(msg.sender), "Convert::convert: sumBorrow must be less than $1");

        uint amount = doTransferIn(msg.sender, pTokenFrom, pTokenFromAmount);

        balances[msg.sender].amount += calcConvertAmount(amount);

        return true;
    }

    function calcConvertAmount(uint pTokenFromAmount) public view returns(uint) {
        uint pTokenFromDecimals = ERC20(pTokenFrom).decimals();
        uint tokenToDecimals = ERC20(tokenTo).decimals();
        uint factor;

        if (pTokenFromDecimals >= tokenToDecimals) {
            factor = 10**(pTokenFromDecimals - tokenToDecimals);
            return pTokenFromAmount * course / factor / 1e18;
        } else {
            factor = 10**(tokenToDecimals - pTokenFromDecimals);
            return pTokenFromAmount * course * factor / 1e18;
        }
    }

    function claimToken() public returns (bool) {
        require(block.number > checkpoints[0].fromBlock, "Convert::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Convert::claimToken: user in black list");

        uint amount = calcClaimAmount(msg.sender);

        balances[msg.sender].out += amount;

        doTransferOut(tokenTo, msg.sender, amount);

        return true;
    }

    function calcClaimAmount(address user) public view returns (uint) {
        uint amount = balances[user].amount;

        if (amount == 0) {
            return 0;
        }

        uint claimAmount;
        uint currentBlockNum = block.number;
        uint allBlockAmount;
        uint blockAmount;

        for (uint i = 0; i < checkpoints.length; i++) {
            if (currentBlockNum < checkpoints[i].fromBlock) {
                break;
            }

            allBlockAmount = checkpoints[i].toBlock - checkpoints[i].fromBlock;

            if (currentBlockNum >= checkpoints[i].toBlock) {
                blockAmount = allBlockAmount;
            } else {
                blockAmount = currentBlockNum - checkpoints[i].fromBlock;
            }

            claimAmount += blockAmount * amount * checkpoints[i].value / allBlockAmount / 100  / 1e18;
        }

        return claimAmount - balances[user].out;
    }

    function getCheckpointLength() public view returns (uint) {
        return checkpoints.length;
    }
}