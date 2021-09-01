//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Services/ERC20.sol";
import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Convert is Service, BlackList {
    address public pTokenFrom;
    address public tokenTo;
    address public reservoir;

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
        uint percent; // for example 1e18 is 100%
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
        address ETHUSDPriceFeed_,
        address reservoir_
    ) Service(controller_, ETHUSDPriceFeed_) {
        require(
            pTokenFrom_ != address(0)
            && tokenTo_ != address(0)
            && controller_ != address(0)
            && ETHUSDPriceFeed_ != address(0)
            && reservoir_ != address(0),
            "Convert::Constructor: address is 0"
        );

        require(
            course_ != 0
            && startBlock_ != 0
            && endBlock_ != 0,
            "Convert::Constructor: num is 0"
        );

        require(
            startBlock_ > block.number
            && startBlock_ < endBlock_,
            "Convert::Constructor: start block must be more than current block and less than end block"
        );

        pTokenFrom = pTokenFrom_;
        tokenTo = tokenTo_;

        controller = controller_;
        ETHUSDPriceFeed = ETHUSDPriceFeed_;

        reservoir = reservoir_;

        course = course_;
        startBlock = startBlock_;
        endBlock = endBlock_;
    }

    function addCheckpointAndTokensAmount(uint fromBlock_, uint toBlock_, uint percent_) public onlyOwner returns (bool) {
        require(block.number < fromBlock_, "Convert::addCheckpoint: current block value must be less than from block value");
        require(startBlock < fromBlock_, "Convert::addCheckpoint: start block value must be less than from block value");
        require(fromBlock_ < toBlock_, "Convert::addCheckpoint: to block value must be more than from block value");
        require(toBlock_ < endBlock, "Convert::addCheckpoint: to block value must be less than end block");
        require(percent_ > 0, "Convert::addCheckpoint: percent value must be more than 0");

        uint length = uint(checkpoints.length);
        if (length > 0) {
            require(checkpoints[length - 1].toBlock < fromBlock_, "Convert::addCheckpoint: block value must be more than previous last block value");
        }

        Checkpoint memory cp;
        cp.fromBlock = fromBlock_;
        cp.toBlock = toBlock_;
        cp.percent = percent_;

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

        if (amount == 0 || amount == balances[user].out) {
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

            claimAmount += blockAmount * amount * checkpoints[i].percent / allBlockAmount / 1e18;
        }

        return claimAmount - balances[user].out;
    }

    function getCheckpointsLength() public view returns (uint) {
        return checkpoints.length;
    }

    function doTransferOut(address token, address to, uint amount) internal override {
        ERC20(token).transferFrom(reservoir, to, amount);

        bool success;
        assembly {
            switch returndatasize()
            case 0 {                      // This is a non-standard ERC-20
                success := not(0)          // set success to true
            }
            case 32 {                     // This is a complaint ERC-20
                returndatacopy(0, 0, 32)
                success := mload(0)        // Set `success = returndata` of external call
            }
            default {                     // This is an excessively non-compliant ERC-20, revert.
                revert(0, 0)
            }
        }
        require(success, "TOKEN_TRANSFER_OUT_FAILED");
    }
}