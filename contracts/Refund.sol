//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Services/ERC20.sol";
import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Refund is Service, BlackList {
    uint public startBlock;
    uint public endBlock;

    mapping(address => mapping(address => uint)) public pTokens;
    mapping(address => address) public baseTokens;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => mapping(address => Balance)) public balances;
    mapping(address => uint[]) public checkpoints;
    mapping(address => uint) public totalAmount;

    constructor(
        uint startBlock_,
        uint endBlock_,
        address controller_,
        address ETHUSDPriceFeed_
    ) Service(controller_, ETHUSDPriceFeed_) {
        require(
            startBlock_ != 0
            && endBlock_ != 0,
            "Refund::Constructor: block num is 0"
        );

        require(
            startBlock_ > block.number
            && startBlock_ < endBlock_,
            "Refund::Constructor: start block must be more than current block and less than end block"
        );

        startBlock = startBlock_;
        endBlock = endBlock_;
    }

    function addRefundPair(address pToken, address baseToken, uint course) public onlyOwner returns (bool) {
        pTokens[pToken][baseToken] = course;
        baseTokens[pToken] = baseToken;

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
        require(endBlock < block.number, "Refund::removeUnused: bad timing for the request");

        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function refund(address pToken, uint pTokenAmount) public returns (bool) {
        require(block.number < startBlock, "Refund::refund: you can convert pTokens before start block only");
        require(checkBorrowBalance(msg.sender), "Refund::refund: sumBorrow must be less than $1");

        uint pTokenAmountIn = doTransferIn(msg.sender, pToken, pTokenAmount);

        address baseToken = baseTokens[pToken];
        uint baseTokenAmount = calcRefundAmount(pToken, pTokenAmountIn);
        balances[msg.sender][baseToken].amount += baseTokenAmount;
        totalAmount[baseToken] += baseTokenAmount;

        return true;
    }

    function calcRefundAmount(address pToken, uint amount) public view returns (uint) {
        address baseToken = baseTokens[pToken];
        uint course = pTokens[pToken][baseToken];

        return amount * course / 1e18;
    }

    function claimToken(address pToken) public returns (bool) {
        require(block.number > startBlock, "Refund::claimToken: bad timing for the request");
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

        return claimAmount - balances[user][baseToken].out;
    }

    function getCheckpointsLength(address baseToken_) public view returns (uint) {
        return checkpoints[baseToken_].length;
    }
}
