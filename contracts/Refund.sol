//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Services/ERC20.sol";
import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Refund is Service, BlackList {
    uint public startTimestamp;
    uint public endTimestamp;

    mapping(address => Base) public pTokens;
    address[] pTokensList;

    struct Base {
        address baseToken;
        uint course;
    }

    mapping(address => address) public baseTokens;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => mapping(address => Balance)) public balances;
    mapping(address => uint[]) public checkpoints;
    mapping(address => uint) public totalAmount;

    constructor(
        uint startTimestamp_,
        uint endTimestamp_,
        address controller_,
        address ETHUSDPriceFeed_
    ) Service(controller_, ETHUSDPriceFeed_) {
        require(
            startTimestamp_ != 0
            && endTimestamp_ != 0,
            "Refund::Constructor: timestamp is 0"
        );

        require(
            startTimestamp_ > block.timestamp
            && startTimestamp_ < endTimestamp_,
            "Refund::Constructor: start timestamp must be more than current timestamp and less than end timestamp"
        );

        startTimestamp = startTimestamp_;
        endTimestamp = endTimestamp_;
    }

    function addRefundPair(address pToken, address baseToken_, uint course_) public onlyOwner returns (bool) {
        pTokens[pToken] = Base({baseToken: baseToken_, course: course_});
        baseTokens[pToken] = baseToken_;
        pTokensList.push(pToken);

        return true;
    }

    function addTokensAndCheckpoint(address baseToken, uint baseTokenAmount) public onlyOwner returns (bool) {
        uint amountIn = doTransferIn(msg.sender, baseToken, baseTokenAmount);

        if (amountIn > 0 ) {
            checkpoints[baseToken].push(amountIn);
        }

        return true;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        require(endTimestamp < block.timestamp, "Refund::removeUnused: bad timing for the request");

        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function refund(address pToken, uint pTokenAmount) public returns (bool) {
        require(block.timestamp < startTimestamp, "Refund::refund: you can convert pTokens before start timestamp only");
        require(checkBorrowBalance(msg.sender), "Refund::refund: sumBorrow must be less than $1");

        uint pTokenAmountIn = doTransferIn(msg.sender, pToken, pTokenAmount);

        address baseToken = baseTokens[pToken];
        uint baseTokenAmount = calcRefundAmount(pToken, pTokenAmountIn);
        balances[msg.sender][baseToken].amount += baseTokenAmount;
        totalAmount[baseToken] += baseTokenAmount;

        return true;
    }

    function calcRefundAmount(address pToken, uint amount) public view returns (uint) {
        uint course = pTokens[pToken].course;

        uint pTokenDecimals = ERC20(pToken).decimals();
        uint baseTokenDecimals = ERC20(pTokens[pToken].baseToken).decimals();
        uint factor;

        if (pTokenDecimals >= baseTokenDecimals) {
            factor = 10**(pTokenDecimals - baseTokenDecimals);
            return amount * course / factor / 1e18;
        } else {
            factor = 10**(baseTokenDecimals - pTokenDecimals);
            return amount * course * factor / 1e18;
        }
    }

    function claimToken(address pToken) public returns (bool) {
        require(block.timestamp > startTimestamp, "Refund::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Refund::claimToken: user in black list");

        uint amount = calcClaimAmount(msg.sender, pToken);

        address baseToken = baseTokens[pToken];
        balances[msg.sender][baseToken].out += amount;

        doTransferOut(baseToken, msg.sender, amount);

        return true;
    }

    function calcClaimAmount(address user, address pToken) public view returns (uint) {
        address baseToken = baseTokens[pToken];
        uint amount = balances[user][baseToken].amount;

        if (amount == 0 || amount == balances[user][baseToken].out) {
            return 0;
        }

        uint claimAmount;

        for (uint i = 0; i < checkpoints[baseToken].length; i++) {
            claimAmount += amount * checkpoints[baseToken][i] / totalAmount[baseToken];
        }

        if (claimAmount > amount) {
            return amount - balances[user][baseToken].out;
        } else {
            return claimAmount - balances[user][baseToken].out;
        }
    }

    function getCheckpointsLength(address baseToken_) public view returns (uint) {
        return checkpoints[baseToken_].length;
    }

    function getPTokenList() public view returns (address[] memory) {
        return pTokensList;
    }

    function getPTokenListLength() public view returns (uint) {
        return pTokensList.length;
    }
}
