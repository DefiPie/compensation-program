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
            startBlock_ > block.number,
            "Refund::Constructor: start block must be more than current block"
        );

        startBlock = startBlock_;
        endBlock = endBlock_;
    }

    function addRefundPair(address pToken, address baseToken, uint course) public onlyOwner returns (bool) {
        pTokens[pToken][baseToken] = course;
        baseTokens[baseToken] = pToken;

        return true;
    }

    function addTokenAmount(address baseToken, uint baseTokenAmount) public onlyOwner returns (bool) {
        doTransferIn(msg.sender, baseToken, baseTokenAmount);

        return true;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        require(endBlock > block.number, "Refund::removeUnused: bad timing for the request");

        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function refund(address pToken, uint pTokenAmount) public returns (bool) {
        require(block.number < startBlock, "Refund::refund: you can convert pTokens before start block only");
        require(checkBorrowBalance(msg.sender), "Refund::refund: sumBorrow must be less than $1");

        uint amount = doTransferIn(msg.sender, pToken, pTokenAmount);

        balances[msg.sender][pToken].amount += calcRefundAmount(pToken, amount);

        return true;
    }

    function calcRefundAmount(address pToken, uint amount) public view returns (uint) {
        address baseToken = baseTokens[pToken];
        uint course = pTokens[pToken][baseToken];

        return amount * course;
    }

    function claimToken(address pToken) public returns (bool) {
        require(block.number > startBlock, "Refund::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Refund::claimToken: user in black list");

        uint amount = balances[msg.sender][pToken].amount - balances[msg.sender][pToken].out;

        balances[msg.sender][pToken].out += amount;
        address baseToken = baseTokens[pToken];

        doTransferOut(baseToken, msg.sender, amount);

        return true;
    }
}
