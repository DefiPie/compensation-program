//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Refund is Ownable {

    constructor() {

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
