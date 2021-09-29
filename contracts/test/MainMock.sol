//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../Services/Interfaces.sol";

contract MainMock {
    address[] public assets;
    mapping(address => uint) public prices;
    int256 public ethPrice = 313899000000;

    // controller function
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

    function setLatestAnswere(int ethPrice_) external {
        ethPrice = ethPrice_;
    }

    function factory() external returns (address) {
        return address(this);
    }

    function registry() external returns (address) {
        return address(this);
    }

    function pETH() external returns (address) {
        return address(this);
    }

}
