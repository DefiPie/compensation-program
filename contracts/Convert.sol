//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./tokens/ERC20.sol";
import "./interfaces/Interfaces.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract BlackList is Ownable {
    mapping (address => bool) public isBlackListed;

    event AddedBlackList(address _user);

    event RemovedBlackList(address _user);

    function addBlackList (address _evilUser) public onlyOwner {
        isBlackListed[_evilUser] = true;

        emit AddedBlackList(_evilUser);
    }

    function removeBlackList (address _clearedUser) public onlyOwner {
        isBlackListed[_clearedUser] = false;

        emit RemovedBlackList(_clearedUser);
    }

    function getBlackListStatus(address _maker) external view returns (bool) {
        return isBlackListed[_maker];
    }
}

contract Convert is BlackList {
    address public pTokenFrom;
    address public tokenTo;

    address public controller;
    address public ETHUSDPriceFeed;

    uint public course;
    uint public startBlock;
    uint public removeBlocks = 1203664; // 0,5 year in blocks

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

    constructor(address pTokenFrom_, address tokenTo_, address controller_, address ETHUSDPriceFeed_, uint course_, uint startBlock_) {
        require(
            pTokenFrom_ != address(0)
            && tokenTo_ != address(0)
            && controller_ != address(0)
            && ETHUSDPriceFeed_ != address(0),
            "Convert::Constructor: address is 0"
        );

        require(
            course_ != 0
            && startBlock_ != 0,
            "Convert::Constructor: course or startBlock is 0"
        );

        pTokenFrom = pTokenFrom_;
        tokenTo = tokenTo_;

        controller = controller_;
        ETHUSDPriceFeed = ETHUSDPriceFeed_;

        course = course_;
        startBlock = startBlock_;
    }

    function addTokenAmount(uint amount) public onlyOwner returns (bool) {
        doTransferIn(owner(), tokenTo, amount);

        return true;
    }

    function removeUnusedToken(uint amount) public onlyOwner returns (bool) {
        require((checkpoints[checkpoints.length - 1].toBlock + removeBlocks) < block.number, "Convert::removeUnusedToken: bad timing for the request");

        doTransferOut(tokenTo, owner(), amount);

        return true;
    }

    function addCheckpoint(uint fromBlock_, uint toBlock_, uint value_) public onlyOwner returns (bool) {
        require(block.number < fromBlock_, "Convert::addCheckpoint: block value must be more than current block");
        require(startBlock < fromBlock_, "Convert::addCheckpoint: block value must be more than current block");

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
        require(block.number < startBlock, "Convert::convert: you can convert pTokens before first checkpoint block num only");

        uint sumBorrow = calcAccountBorrow(msg.sender);

        if (sumBorrow != 0) {
            uint ETHUSDPrice = uint(AggregatorInterface(ETHUSDPriceFeed).latestAnswer());
            uint loan = sumBorrow * ETHUSDPrice / 1e8 / 1e18; // 1e8 is chainlink, 1e18 is eth

            require(loan < 1, "Convert::convert: sumBorrow must be less than $1");
        }

        uint amount = doTransferIn(msg.sender, pTokenFrom, pTokenFromAmount);

        balances[msg.sender].amount += calcConvertAmount(amount);

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
        require(!isBlackListed[msg.sender], "Convert::claimToken: user in black list");

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

        return claimAmount - balances[user].out;
    }

    function getCheckpointLength() public view returns (uint) {
        return checkpoints.length;
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