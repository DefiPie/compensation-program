//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Services/ERC20.sol";
import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Refund is Service, BlackList {
    uint public startBlock;
    uint public removeBlocks;

    mapping(address => mapping(address => uint)) public pTokens;

    constructor(
        uint startBlock_,
        uint removeBlocks_,
        address controller_,
        address ETHUSDPriceFeed_
    ) Service(controller_, ETHUSDPriceFeed_) {
        require(
            startBlock_ != 0
            && removeBlocks_ != 0,
            "Refund::Constructor: block num is 0"
        );

        require(
            startBlock_ > block.number,
            "Refund::Constructor: start block must be more than current block"
        );

        startBlock = startBlock_;
        removeBlocks = removeBlocks_;
    }

    function addRefundPair(address pToken, address baseToken, uint baseTokenAmount) public onlyOwner returns (bool) {
        pTokens[pToken][baseToken] = baseTokenAmount;

        return true;
    }

    function addTokenAmount(address baseToken, uint baseTokenAmount) public onlyOwner returns (bool) {
        doTransferIn(msg.sender, baseToken, baseTokenAmount);

        return true;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        require(startBlock + removeBlocks < block.number, "Refund::removeUnused: bad timing for the request");

        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function refund(address pToken, address baseToken) public returns (bool) {

        return true;
    }

    function calcRefundAmount(address pToken, address baseToken) public returns (uint) {

        return 0;
    }

}
