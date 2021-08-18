//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/ERC20.sol";
import "./interfaces/Interfaces.sol";
import "./Blacklist.sol";

contract Compensation is BlackList {

    address public stableCoin;
    uint public startBlock;
    uint public removeBlocks = 1203664; // 0,5 year in blocks for eth

    address public controller;
    address public ETHUSDPriceFeed;

    mapping(address => uint) public pTokens;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => Balance) public balances;

    constructor(address stableCoin_, uint startBlock_, uint removeBlocks_, address controller_, address ETHUSDPriceFeed_) {
        require(
            stableCoin != address(0)
            && controller_ != address(0)
            && ETHUSDPriceFeed_ != address(0),
            "Compensation::Constructor: address is 0"
        );

        require(
            startBlock_ != 0
            && removeBlocks_ != 0,
            "Compensation::Constructor: block num is 0"
        );

        require(
            startBlock_ > block.number,
            "Compensation::Constructor: start block must be more than current block"
        );

        stableCoin = stableCoin_;

        startBlock = startBlock_;
        removeBlocks = removeBlocks_;

        controller = controller_;
        ETHUSDPriceFeed = ETHUSDPriceFeed_;
    }

    function addPToken(address pToken, uint price) public onlyOwner returns (bool) {
        pTokens[pToken] = price;

        return true;
    }

    function addStableCoinAmount(uint amount) public onlyOwner returns (bool) {
        doTransferIn(msg.sender, stableCoin, amount);

        return true;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        require(startBlock + removeBlocks < block.number, "Convert::removeUnused: bad timing for the request");

        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function compensation(address pToken, uint pTokenAmount) public returns (bool) {
        require(block.number > startBlock, "Convert::convert: you can convert pTokens after start block only");

        uint sumBorrow = calcAccountBorrow(msg.sender);

        if (sumBorrow != 0) {
            uint ETHUSDPrice = uint(AggregatorInterface(ETHUSDPriceFeed).latestAnswer());
            uint loan = sumBorrow * ETHUSDPrice / 1e8 / 1e18; // 1e8 is chainlink, 1e18 is eth

            require(loan < 1, "Convert::convert: sumBorrow must be less than $1");
        }

        uint amount = doTransferIn(msg.sender, pToken, pTokenAmount);

        balances[msg.sender].amount += calcCompensationAmount(pToken, amount);

        return true;
    }

    function calcCompensationAmount(address pToken, uint amount) public returns (uint) {

        return 0;
    }

    function claimToken() public returns (bool) {
        require(block.number > startBlock, "Convert::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Convert::claimToken: user in black list");

        uint amount = balances[msg.sender].amount - balances[msg.sender].out;

        balances[msg.sender].out += amount;

        doTransferOut(stableCoin, msg.sender, amount);

        return true;
    }

    function calcAccountBorrow(
        address account
    ) public view returns (uint) {
        uint sumBorrow;

        address[] memory assets = ControllerInterface(controller).getAssetsIn(account);
        for (uint i = 0; i < assets.length; i++) {
            address asset = assets[i];

            uint borrowBalance = PTokenInterface(asset).borrowBalanceStored(account);
            uint price = ControllerInterface(controller).getOracle().getUnderlyingPrice(asset);

            sumBorrow += price * borrowBalance;
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
