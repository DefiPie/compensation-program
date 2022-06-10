//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Services/Blacklist.sol";
import "./Services/Transfers.sol";

contract Compensation is Transfers, BlackList {

    address public oldPPieToken;
    address public newPIEToken;
    uint public startTimestamp;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => Balance) public balances;

    uint[] public checkpoints;
    uint public totalOldPPieTokenAmount;

    constructor(
        address oldPPieToken_,
        address newPIEToken_,
        uint startTimestamp_
    ) {
        require(oldPPieToken_ != address(0), "Compensation::Constructor: oldPPieToken_ is 0");

        require(
            startTimestamp_ != 0,
            "Compensation::Constructor: timestamp is 0"
        );

        require(
            startTimestamp_ > getBlockTimestamp(),
            "Compensation::Constructor: start timestamp must be more than current timestamp"
        );

        oldPPieToken = oldPPieToken_;
        newPIEToken = newPIEToken_;
        startTimestamp = startTimestamp_;
    }

    function addCheckpoint(uint newPIETokenAmount) public onlyOwner returns (bool) {
        uint amountIn = doTransferIn(msg.sender, newPIEToken, newPIETokenAmount);

        if (amountIn > 0 ) {
            checkpoints.push(amountIn);
        }

        return true;
    }

    function withdraw(address token, uint amount) public onlyOwner returns (bool) {
        doTransferOut(token, msg.sender, amount);

        return true;
    }

    function addUserBalance(address user, uint amount) public onlyOwner returns (bool) {
        balances[user].amount += amount;
        totalOldPPieTokenAmount += amount;

        return true;
    }

    function compensation(uint amount) public returns (bool) {
        require(getBlockTimestamp() < startTimestamp, "Compensation::compensation: you can convert pTokens before start timestamp only");

        doTransferIn(msg.sender, oldPPieToken, amount);

        balances[msg.sender].amount += amount;
        totalOldPPieTokenAmount += amount;

        return true;
    }

    function claimToken(uint amount) public returns (bool) {
        require(getBlockTimestamp() > startTimestamp, "Compensation::claimToken: bad timing for the request");
        require(!isBlackListed[msg.sender], "Compensation::claimToken: user in black list");

        balances[msg.sender].out += amount;

        doTransferOut(newPIEToken, msg.sender, amount);

        return true;
    }

    function getCheckpointsLength() public view returns (uint) {
        return checkpoints.length;
    }

    function getBlockTimestamp() public view virtual returns (uint) {
        return block.timestamp;
    }
}
