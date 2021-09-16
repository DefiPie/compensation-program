//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Interfaces.sol";
import "./ERC20.sol";

contract Service {
    address public controller;
    address public ETHUSDPriceFeed;

    constructor(address controller_, address ETHUSDPriceFeed_) {
        require(
            controller_ != address(0)
            && ETHUSDPriceFeed_ != address(0),
            "Service::Constructor: address is 0"
        );

        controller = controller_;
        ETHUSDPriceFeed = ETHUSDPriceFeed_;
    }

    function checkBorrowBalance(address account) public view returns (bool) {
        uint sumBorrow = calcAccountBorrow(account);

        if (sumBorrow != 0) {
            uint ETHUSDPrice = uint(AggregatorInterface(ETHUSDPriceFeed).latestAnswer());
            uint loan = sumBorrow * ETHUSDPrice / 1e8 / 1e18; // 1e8 is chainlink, 1e18 is eth

            return loan < 1;
        }

        return true;
    }

    function calcAccountBorrow(address account) public view returns (uint) {
        uint sumBorrow;

        address[] memory assets = ControllerInterface(controller).getAssetsIn(account);
        for (uint i = 0; i < assets.length; i++) {
            address asset = assets[i];

            uint borrowBalance = PTokenInterface(asset).borrowBalanceStored(account);
            uint price = ControllerInterface(controller).getOracle().getUnderlyingPrice(asset);

            if (asset == RegistryInterface(FactoryInterface(ControllerInterface(controller).factory()).registry()).pETH()) {
                sumBorrow += price * borrowBalance / 10 ** 18;
            } else {
                sumBorrow += price * borrowBalance / (10 ** ERC20(PTokenInterface(asset).underlying()).decimals());
            }
        }

        return sumBorrow;
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
