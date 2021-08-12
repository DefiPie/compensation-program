//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Refund is Ownable {
    using SafeERC20 for IERC20;

    constructor() {

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

    function doTransferOut(address token, address to, uint amount) internal {
        if (amount == 0) {
            return;
        }

        IERC20 ERC20Interface = IERC20(token);
        ERC20Interface.safeTransfer(to, amount);
    }

    function doTransferIn(address from, address token, uint amount) internal {
        IERC20 ERC20Interface = IERC20(token);
        ERC20Interface.safeTransferFrom(from, address(this), amount);
    }
}
