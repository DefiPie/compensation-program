//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/IERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Convert is Ownable {
    address public tokenFrom;
    address public tokenTo;

    constructor(address tokenFrom_, address tokenTo_) {
        require(
            tokenFrom_ != address(0)
            && tokenTo_ != address(0),
            "Convert::Constructor: address is 0"
        );

        tokenFrom = tokenFrom_;
        tokenTo = tokenTo_;
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