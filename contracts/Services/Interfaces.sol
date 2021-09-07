// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface PTokenInterface {
    function borrowBalanceStored(address account) external view returns (uint);
}

interface PriceOracle {
    function getUnderlyingPrice(address pToken) external view returns (uint);
}

interface ControllerInterface {
    function getOracle() external view returns (PriceOracle);
    function getAssetsIn(address account) external view returns (address[] memory);
}

interface AggregatorInterface {
    function latestAnswer() external view returns (int256);
}
