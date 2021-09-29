//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "../Compensation.sol";

contract CompensationExt is Compensation {
    uint public blockTimestamp;

    constructor(
        address stableCoin_,
        uint startTimestamp_,
        uint endTimestamp_,
        address controller_,
        address ETHUSDPriceFeed_,
        uint rewardAPY_,
        uint lastApyTimestamp_
    ) Compensation(
        stableCoin_,
        startTimestamp_,
        endTimestamp_,
        controller_,
        ETHUSDPriceFeed_,
        rewardAPY_,
        lastApyTimestamp_
    ) {}

    function setBlockTimestamp(uint blockTimestamp_) public returns (uint) {
        blockTimestamp = blockTimestamp_;
    }

    function getBlockTimestamp() public view override returns (uint) {
        return blockTimestamp;
    }
}
