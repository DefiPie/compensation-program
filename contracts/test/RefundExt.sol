//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Refund.sol";

contract RefundExt is Refund {
    uint public blockTimestamp;

    constructor(
        uint startTimestamp_,
        uint endTimestamp_,
        address controller_,
        address pETH_,
        address calcPoolPrice_
    ) Refund (
        startTimestamp_,
        endTimestamp_,
        controller_,
        pETH_,
        calcPoolPrice_
    ) {}

    function setBlockTimestamp(uint blockTimestamp_) public {
        blockTimestamp = blockTimestamp_;
    }

    function getBlockTimestamp() public view override returns (uint) {
        return blockTimestamp;
    }
}
