//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Services/Blacklist.sol";
import "./Services/Service.sol";

contract Compensation is Service, BlackList {

    address public stableCoin;
    uint public startBlock;
    uint public endBlock;

    mapping(address => uint) public pTokens;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => Balance) public balances;
    uint[] public checkpoints;
    uint public totalAmount;

    constructor(
        address stableCoin_,
        uint startBlock_,
        uint endBlock_,
        address controller_,
        address ETHUSDPriceFeed_
    ) Service(controller_, ETHUSDPriceFeed_) {
        require(
            stableCoin_ != address(0)
            && controller_ != address(0)
            && ETHUSDPriceFeed_ != address(0),
            "Compensation::Constructor: address is 0"
        );

        require(
            startBlock_ != 0
            && endBlock_ != 0,
            "Compensation::Constructor: block num is 0"
        );

        require(
            startBlock_ > block.number
            && startBlock_ < endBlock_,
            "Compensation::Constructor: start block must be more than current block and less than end block"
        );

        stableCoin = stableCoin_;

        startBlock = startBlock_;
        endBlock = endBlock_;
    }

    function addPToken(address pToken, uint price) public onlyOwner returns (bool) {
        pTokens[pToken] = price;

        return true;
    }

    function addCheckpoint(uint stableCoinAmount) public onlyOwner returns (bool) {
        uint amountIn = doTransferIn(msg.sender, stableCoin, stableCoinAmount);

        if (amountIn > 0 ) {
            checkpoints.push(amountIn);
        }

        return true;
    }

    function removeUnused(address token, uint amount) public onlyOwner returns (bool) {
        require(endBlock > block.number, "Compensation::removeUnused: bad timing for the request");

        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function compensation(address pToken, uint pTokenAmount) public returns (bool) {
        require(block.number < startBlock, "Compensation::compensation: you can convert pTokens before start block only");
        require(checkBorrowBalance(msg.sender), "Compensation::compensation: sumBorrow must be less than $1");

        uint amount = doTransferIn(msg.sender, pToken, pTokenAmount);

        balances[msg.sender].amount += calcCompensationAmount(pToken, amount);
        totalAmount += amount;

        return true;
    }

    function calcCompensationAmount(address pToken, uint amount) public view returns (uint) {
        uint price = pTokens[pToken];

        return amount * price;
    }

    function claimToken() public returns (bool) {
        require(block.number > startBlock, "Compensation::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Compensation::claimToken: user in black list");

        uint amount = calcClaimAmount(msg.sender);

        balances[msg.sender].out += amount;

        doTransferOut(stableCoin, msg.sender, amount);

        return true;
    }

    function calcClaimAmount(address user) public view returns (uint) {
        uint amount = balances[user].amount;

        if (amount == 0 || amount == balances[user].out) {
            return 0;
        }

        uint claimAmount;

        for (uint i = 0; i < checkpoints.length; i++) {
            claimAmount += amount * checkpoints[i] / totalAmount;
        }

        return claimAmount - balances[user].out;
    }
}
