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

    mapping(address => uint) public balances;

    struct Checkpoint {
        uint fromBlock;
        uint value;
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

    function addCheckpoint(uint fromBlock_, uint value_) public onlyOwner returns (bool) {
        require(block.number < fromBlock_, "Convert::addCheckpoint: block value must be more than current block");

        uint length = uint(checkpoints.length);
        if (length > 0) {
            require(checkpoints[length - 1].fromBlock < fromBlock_, "Convert::addCheckpoint: block value must be more than previous block value");
        }

        Checkpoint memory cp;
        cp.fromBlock = fromBlock_;
        cp.value = value_;

        checkpoints.push(cp);

        return true;
    }

    function convert(uint pTokenFromAmount) public returns (bool) {
        require(block.number < checkpoints[0].fromBlock, "Convert::convert: you can convert pTokens before first checkpoint block num only");

        balances[msg.sender] += calcConvertAmount(pTokenFromAmount);

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
        uint amount;

        doTransferOut(tokenTo, msg.sender, amount);
        return true;
    }

    function calcClaimAmount(uint amount) public view returns (uint) {
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