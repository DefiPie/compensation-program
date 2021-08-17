//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/ERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Compensation is Ownable {
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


    function doTransferIn(address from, address token, uint amount) internal returns (uint) {
        uint balanceBefore = ERC20(token).balanceOf(address(this));
        ERC20(token).transferFrom(from, address(this), amount);

        bool success;
        assembly {
            switch returndatasize()
            case 0 {                       // This is a non-standard ERC-20
                success := not(0)          // set success to true
            }
            case 32 {                      // This is a compliant ERC-20
                returndatacopy(0, 0, 32)
                success := mload(0)        // Set `success = returndata` of external call
            }
            default {                      // This is an excessively non-compliant ERC-20, revert.
                revert(0, 0)
            }
        }
        require(success, "TOKEN_TRANSFER_IN_FAILED");

        // Calculate the amount that was *actually* transferred
        uint balanceAfter = ERC20(token).balanceOf(address(this));
        require(balanceAfter >= balanceBefore, "TOKEN_TRANSFER_IN_OVERFLOW");
        return balanceAfter - balanceBefore;   // underflow already checked above, just subtract
    }

    function doTransferOut(address token, address to, uint amount) internal {
        ERC20(token).transfer(to, amount);

        bool success;
        assembly {
            switch returndatasize()
            case 0 {                      // This is a non-standard ERC-20
                success := not(0)          // set success to true
            }
            case 32 {                     // This is a complaint ERC-20
                returndatacopy(0, 0, 32)
                success := mload(0)        // Set `success = returndata` of external call
            }
            default {                     // This is an excessively non-compliant ERC-20, revert.
                revert(0, 0)
            }
        }
        require(success, "TOKEN_TRANSFER_OUT_FAILED");
    }
}
