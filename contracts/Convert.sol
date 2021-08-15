//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract Convert is Ownable {
    using SafeERC20 for IERC20;

    address public pTokenFrom;
    address public tokenTo;
    uint public course;

    struct Balance {
        uint amount;
        uint out;
    }

    mapping(address => Balance) public balances;

    struct Checkpoint {
        uint fromBlock;
        uint toBlock;
        uint value; // for example 10e18 is 10%
    }

    // num => block => value
    Checkpoint[] public checkpoints;

    constructor(address pTokenFrom_, address tokenTo_, uint course_) {
        require(
            pTokenFrom_ != address(0)
            && tokenTo_ != address(0),
            "Convert::Constructor: address is 0"
        );

        require(
            course_ != 0,
            "Convert::Constructor: course is 0"
        );

        pTokenFrom = pTokenFrom_;
        tokenTo = tokenTo_;

        course = course_;
    }

    function addTokenAmount(uint amount) public onlyOwner returns (bool) {
        doTransferIn(owner(), tokenTo, amount);

        return true;
    }

    function removeUnusedToken(uint amount) public onlyOwner returns (bool) {
        doTransferOut(tokenTo, owner(), amount);

        return true;
    }

    function addCheckpoint(uint fromBlock_, uint toBlock_, uint value_) public onlyOwner returns (bool) {
        require(block.number < fromBlock_, "Convert::addCheckpoint: block value must be more than current block");

        uint length = uint(checkpoints.length);
        if (length > 0) {
            require(checkpoints[length - 1].toBlock < fromBlock_, "Convert::addCheckpoint: block value must be more than previous last block value");
        }

        Checkpoint memory cp;
        cp.fromBlock = fromBlock_;
        cp.toBlock = toBlock_;
        cp.value = value_;

        checkpoints.push(cp);

        return true;
    }

    function convert(uint pTokenFromAmount) public returns (bool) {
        require(block.number < checkpoints[0].fromBlock, "Convert::convert: you can convert pTokens before first checkpoint block num only");

        balances[msg.sender].amount += calcConvertAmount(pTokenFromAmount);

        doTransferIn(msg.sender, pTokenFrom, pTokenFromAmount);

        return true;
    }

    function calcConvertAmount(uint pTokenFromAmount) public view returns(uint) {
        uint pTokenFromDecimals = ERC20(pTokenFrom).decimals();
        uint tokenToDecimals = ERC20(tokenTo).decimals();
        uint factor;

        if (pTokenFromDecimals >= tokenToDecimals) {
            factor = 10**(pTokenFromDecimals - tokenToDecimals);
            return pTokenFromAmount * course / factor / 1e18;
        } else {
            factor = 10**(tokenToDecimals - pTokenFromDecimals);
            return pTokenFromAmount * course * factor / 1e18;
        }
    }

    function claimToken() public returns (bool) {
        require(block.number > checkpoints[0].fromBlock, "Convert::claimToken: bad timing for the request");

        uint amount = calcClaimAmount(msg.sender);

        balances[msg.sender].out += amount;

        doTransferOut(tokenTo, msg.sender, amount);

        return true;
    }

    function calcClaimAmount(address user) public view returns (uint) {
        uint amount = balances[user].amount;

        if (amount == 0) {
            return 0;
        }

        uint claimAmount;
        uint currentBlockNum = block.number;
        uint allBlockAmount;
        uint blockAmount;

        for (uint i = 0; i < checkpoints.length; i++) {
            if (currentBlockNum < checkpoints[i].fromBlock) {
                break;
            }

            allBlockAmount = checkpoints[i].toBlock - checkpoints[i].fromBlock;

            if (currentBlockNum >= checkpoints[i].toBlock) {
                blockAmount = allBlockAmount;
            } else {
                blockAmount = currentBlockNum - checkpoints[i].fromBlock;
            }

            claimAmount += blockAmount * amount * checkpoints[i].value / allBlockAmount / 100  / 1e18;
        }

        return 0;
    }

    function getCheckpointLength() public view returns (uint) {
        return checkpoints.length;
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