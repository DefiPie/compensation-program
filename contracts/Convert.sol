//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Convert is Ownable {
    using SafeERC20 for IERC20;

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

    function addTokenAmount(uint amount) public onlyOwner returns (bool) {

        return true;
    }

    function convert(uint amount) public returns (bool) {


        return true;
    }

    function calcConvertAmount(uint amount) public view returns (uint) {
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