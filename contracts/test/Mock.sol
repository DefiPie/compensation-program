//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../Services/Interfaces.sol";

contract Mock {
    uint public borrowBalance;
    address[] public assets;
    mapping(address => uint) public prices;
    int256 public ethPrice;

    // controller function
    function borrowBalanceStored(address account) external view returns (uint) {
        account; // remove warnings
        return borrowBalance;
    }

    function borrowBalanceStored(uint borrowBalance_) external {
        borrowBalance = borrowBalance_;
    }

    function getAssetsIn(address account) external view returns (address[] memory) {
        account; // remove warnings
        return assets;
    }

    function addPToken(address asset) external {
        assets.push(asset);
    }

    function getOracle() external view returns (PriceOracle) {
        return PriceOracle(address(this));
    }

    // price oracle function
    function getUnderlyingPrice(address asset) external view returns (uint) {
        return prices[asset];
    }

    function setUnderlyingPrice(address asset, uint price_) external {
        prices[asset] = price_;
    }

    // chain link function
    function latestAnswer() external view returns (int256) {
        return ethPrice;
    }

    function getUnderlyingPrice(int ethPrice_) external {
        ethPrice = ethPrice_;
    }

}
