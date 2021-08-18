//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/ERC20.sol";
import "./Blacklist.sol";
import "./Service.sol";

contract Refund is Service, BlackList {

    constructor(
        address controller_,
        address ETHUSDPriceFeed_
    ) Service(controller_, ETHUSDPriceFeed_) {

    }

    function addRefundPair(address pToken, address baseToken, uint tokenAmount) public onlyOwner returns (bool) {

        return true;
    }

    function addTokenAmount(address pToken, address baseToken, uint amount) public onlyOwner returns (bool) {

        return true;
    }

    function refund(address pToken, address baseToken) public returns (bool) {

        return true;
    }

    function calcRefundAmount(address pToken, address baseToken) public returns (uint) {

        return 0;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        doTransferOut(token, owner(), amount);

        return true;
    }

}
