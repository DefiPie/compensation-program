//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Services/ERC20.sol";
import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Convert is Service, BlackList {
    address public pTokenFrom;
    address public tokenTo;
    address public reservoir;

    uint public course;
    uint public startTimestamp;
    uint public endTimestamp;

    struct Balance {
        uint pTokenIn;
        uint amount;
        uint out;
    }

    mapping(address => Balance) public balances;

    struct Checkpoint {
        uint fromTimestamp;
        uint toTimestamp;
        uint percent; // for example 1e18 is 100%
    }

    // num => timestamp => value
    Checkpoint[] public checkpoints;

    constructor(
        address pTokenFrom_,
        address tokenTo_,
        uint startTimestamp_,
        uint endTimestamp_,
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
            startTimestamp_ != 0
            && endTimestamp_ != 0,
            "Convert::Constructor: num is 0"
        );

        require(
            startTimestamp_ > block.timestamp
            && startTimestamp_ < endTimestamp_,
            "Convert::Constructor: start timestamp must be more than current timestamp and less than end timestamp"
        );

        pTokenFrom = pTokenFrom_;
        tokenTo = tokenTo_;

        controller = controller_;
        ETHUSDPriceFeed = ETHUSDPriceFeed_;

        reservoir = reservoir_;

        course = PTokenInterface(pTokenFrom_).exchangeRateStored();
        startTimestamp = startTimestamp_;
        endTimestamp = endTimestamp_;
    }

    function addCheckpointAndTokensAmount(uint fromTimestamp_, uint toTimestamp_, uint percent_) public onlyOwner returns (bool) {
        require(block.timestamp < fromTimestamp_, "Convert::addCheckpoint: current timestamp value must be less than from timestamp value");
        require(startTimestamp < fromTimestamp_, "Convert::addCheckpoint: start timestamp value must be less than from timestamp value");
        require(fromTimestamp_ < toTimestamp_, "Convert::addCheckpoint: to timestamp value must be more than from timestamp value");
        require(toTimestamp_ < endTimestamp, "Convert::addCheckpoint: to timestamp value must be less than end timestamp");
        require(percent_ > 0, "Convert::addCheckpoint: percent value must be more than 0");

        uint length = uint(checkpoints.length);
        if (length > 0) {
            require(checkpoints[length - 1].toTimestamp < fromTimestamp_, "Convert::addCheckpoint: timestamp value must be more than previous last timestamp value");
        }

        Checkpoint memory cp;
        cp.fromTimestamp = fromTimestamp_;
        cp.toTimestamp = toTimestamp_;
        cp.percent = percent_;

        checkpoints.push(cp);

        return true;
    }

    function removeUnusedToken(uint amount) public onlyOwner returns (bool) {
        require(endTimestamp < block.timestamp, "Convert::removeUnusedToken: bad timing for the request");

        doTransferOut(tokenTo, msg.sender, amount);

        return true;
    }

    function convert(uint pTokenFromAmount) public returns (bool) {
        require(block.timestamp < startTimestamp, "Convert::convert: you can convert pTokens before first checkpoint timestamp only");
        require(checkBorrowBalance(msg.sender), "Convert::convert: sumBorrow must be less than $1");

        uint amount = doTransferIn(msg.sender, pTokenFrom, pTokenFromAmount);

        balances[msg.sender].pTokenIn += amount;

        uint calcAmount = calcConvertAmount(amount);
        balances[msg.sender].amount += calcAmount;

        doTransferIn(reservoir, tokenTo, calcAmount);

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
        require(block.timestamp > checkpoints[0].fromTimestamp, "Convert::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Convert::claimToken: user in black list");

        uint amount = calcClaimAmount(msg.sender);

        balances[msg.sender].out += amount;

        doTransferOut(tokenTo, msg.sender, amount);

        return true;
    }

    function calcClaimAmount(address user) public view returns (uint) {
        uint amount = balances[user].amount;
        uint currentTimestamp = block.timestamp;

        if (getCheckpointsLength() == 0
            || amount == 0
            || amount == balances[user].out
            || currentTimestamp <= checkpoints[0].fromTimestamp)
        {
            return 0;
        }

        uint claimAmount;
        uint delta;
        uint timestampAmount;

        for (uint i = 0; i < checkpoints.length; i++) {
            if (currentTimestamp < checkpoints[i].fromTimestamp) {
                break;
            }

            delta = checkpoints[i].toTimestamp - checkpoints[i].fromTimestamp;

            if (currentTimestamp >= checkpoints[i].toTimestamp) {
                timestampAmount = delta;
            } else {
                timestampAmount = currentTimestamp - checkpoints[i].fromTimestamp;
            }

            claimAmount += timestampAmount * amount * checkpoints[i].percent / delta / 1e18;
        }

        return claimAmount - balances[user].out;
    }

    function getCheckpointsLength() public view returns (uint) {
        return checkpoints.length;
    }

    function getPTokenInAmount(address user) public view returns (uint) {
        return balances[user].pTokenIn;
    }
}