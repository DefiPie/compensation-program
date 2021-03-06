//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Services/ERC20.sol";
import "./Services/Transfers.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./Services/Interfaces.sol";

contract Exchange is Transfers, Ownable {

    struct Balance {
        uint amountIn;
        uint tokenAmountOut;
    }

    mapping(address => Balance) public balances;

    mapping(address => mapping(address => uint)) public deposits;
    mapping(address => uint) public depositsETH;

    address public convert;

    address public token;
    uint public tokenCourse;
    uint public tokenAmount;

    address[] public stableCoins;

    uint public startTimestamp;
    uint public endTimestamp;

    address public priceFeed;

    constructor(
        address convert_,
        address token_,
        uint tokenCourse_, // in USD, 1e18 is $1
        uint tokenAmount_, // 800,000e18 tokens
        address[] memory stableCoins_,
        uint startTimestamp_,
        uint endTimestamp_,
        address priceFeed_
    ) {
        require(
            convert_ != address(0)
            && token_ != address(0)
            && priceFeed_ != address(0),
            "Exchange::Constructor: address is 0"
        );

        require(
            startTimestamp_ != 0
            && endTimestamp_ != 0,
            "Exchange::Constructor: timestamp num is 0"
        );

        require(
            startTimestamp_ > block.timestamp
            && startTimestamp_ < endTimestamp_,
            "Exchange::Constructor: start timestamp must be more than current timestamp and less than end timestamp"
        );

        convert = convert_;

        token = token_;
        tokenCourse = tokenCourse_;
        tokenAmount = tokenAmount_;

        for(uint i = 0; i < stableCoins_.length; i++) {
            stableCoins.push(stableCoins_[i]);
        }

        startTimestamp = startTimestamp_;
        endTimestamp = endTimestamp_;

        priceFeed = priceFeed_;
    }

    function getTokens(address token_, address to, uint amount) public onlyOwner returns (bool) {
        require(getTimeStamp() > endTimestamp, "Exchange::removeTokens: bad timing for the request");

        doTransferOut(token_, to, amount);

        return true;
    }

    function getNative(address payable to, uint amount) public onlyOwner returns (bool) {
        require(getTimeStamp() > endTimestamp, "Exchange::removeNative: bad timing for the request");

        to.transfer(amount);

        return true;
    }

    function deposit(address stableCoin, uint amount) public returns (bool) {
        require(getTimeStamp() < startTimestamp, "Exchange::deposit: bad timing for the request");
        require(checkDepositPToken(msg.sender), "Exchange::deposit: deposit in convert is null");
        require(checkStableCoin(stableCoin), "Exchange::deposit: this stable coin is not allowed");

        uint amountIn = doTransferIn(msg.sender, stableCoin, amount);

        deposits[msg.sender][stableCoin] += amountIn;

        uint USDAmountIn = amount * 1e18 / (10 ** ERC20(stableCoin).decimals()); // 1e18 is normalize

        balances[msg.sender].amountIn += USDAmountIn;

        return true;
    }

    function depositNative() public payable returns (bool) {
        require(getTimeStamp() < startTimestamp, "Exchange::depositNative: bad timing for the request");
        require(checkDepositPToken(msg.sender), "Exchange::depositNative: deposit in convert is null");

        depositsETH[msg.sender] += msg.value;

        uint NativeUSDPrice = uint(AggregatorInterface(priceFeed).latestAnswer());
        uint amountIn = msg.value * NativeUSDPrice / 1e8; // 1e8 is chainlink, also missed: div 1e18 is eth, mul 1e18 is normalize

        balances[msg.sender].amountIn += amountIn;

        return true;
    }

    function claim() public returns (bool) {
        require(getTimeStamp() > startTimestamp, "Exchange::claim: bad timing for the request");
        uint amount = calcAmount(msg.sender);

        if (amount == 0) {
            return true;
        }

        balances[msg.sender].tokenAmountOut += amount;

        doTransferOut(token, msg.sender, amount);

        uint totalAmountIn = balances[msg.sender].amountIn;
        uint totalTokenPrice = amount * tokenCourse;
        uint returnUSDValue;

        if (totalAmountIn > totalTokenPrice) {
            returnUSDValue = totalAmountIn - totalTokenPrice;
            transferOut(payable(msg.sender), returnUSDValue);
        }

        return true;
    }

    function transferOut(address payable user, uint returnUSDValue) internal {
        uint ETHValue = depositsETH[user];
        uint returnValueInUSD = returnUSDValue;

        if (ETHValue > 0) {
            uint NativeUSDPrice = uint(AggregatorInterface(priceFeed).latestAnswer());
            uint amountETHInUSD = ETHValue * NativeUSDPrice / 1e8; // 1e8 is chainlink, also missed: div 1e18 is eth, mul 1e18 is normalize

            if (amountETHInUSD > returnValueInUSD) {
                user.transfer(returnValueInUSD * 1e8 / NativeUSDPrice);
            } else {
                user.transfer(ETHValue);
                returnValueInUSD -= amountETHInUSD;
            }
        }

        for(uint i = 0; i < stableCoins.length; i++) {
            uint amountInStable = deposits[user][stableCoins[i]];
            if (amountInStable > 0) {
                uint amountStableInUSD = amountInStable * 1e18 / (10 ** ERC20(stableCoins[i]).decimals());

                if (amountStableInUSD > returnValueInUSD) {
                    doTransferOut(stableCoins[i], user, returnValueInUSD * (10 ** ERC20(stableCoins[i]).decimals()) / 1e18);
                    break;
                } else {
                    doTransferOut(stableCoins[i], user, amountInStable);
                    returnValueInUSD -= amountStableInUSD;
                }
            } else {
                continue;
            }
        }
    }

    function calcAmount(address user) public view returns (uint) {
        uint amountMax = calcTokenAmountMax(user);
        uint maxDeposit = amountMax * tokenCourse / 1e18 / (10 ** 18); // max in USD, 1e18 is for token course, 10**18 is decimals for token amount
        uint amount;

        if (maxDeposit > balances[msg.sender].amountIn) {
            amount = balances[msg.sender].amountIn * tokenCourse / 1e18;
        } else {
            amount = amountMax;
        }

        uint tokenAmountOut = balances[msg.sender].tokenAmountOut;

        return amount - tokenAmountOut;
    }

    function checkDepositPToken(address user) public view returns (bool) {
        if (ConvertInterface(convert).getPTokenInAmount(user) > 0) {
            return true;
        } else {
            return false;
        }
    }

    function checkStableCoin(address stableCoin_) public view returns (bool) {
        for (uint i = 0; i < stableCoins.length; i++) {
            if (stableCoins[i] == stableCoin_) {
                return true;
            }
        }

        return false;
    }

    function calcTokenAmountMax(address user) public view returns (uint) {
        uint userPTokenAmount = ConvertInterface(convert).getPTokenInAmount(user);
        address pToken = ConvertInterface(convert).pTokenFrom();

        return userPTokenAmount * tokenAmount / ERC20(pToken).balanceOf(convert);
    }

    function getTimeStamp() public view returns (uint) {
        return block.timestamp;
    }
}
