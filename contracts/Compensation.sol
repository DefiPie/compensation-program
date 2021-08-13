//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Compensation is Ownable {
    using SafeERC20 for IERC20;

    address public stableCoin;

    constructor(address stableCoin_) {
        require(
            stableCoin != address(0),
            "Compensation::Constructor: address is 0"
        );

        stableCoin = stableCoin_;
    }

    function addPToken(address pToken, uint price) public onlyOwner returns (bool) {

        return true;
    }

    function addStableCoinAmount(uint amount) public onlyOwner returns (bool) {

        return true;
    }

    function compensation(address pToken, uint amount) public returns (bool) {

        return true;
    }

    function calcCompensationAmount(address pToken, uint amount) public returns (uint) {

        return 0;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        doTransferOut(token, owner(), amount);

        return true;
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
