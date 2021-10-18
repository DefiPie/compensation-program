// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Services/ERC20.sol";
import "./Services/Transfers.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./Services/Interfaces.sol";

contract Exchange is Transfers, Ownable {

    address[] public stableCoins;
    mapping(address => bool) public allowedStableCoins;

    // user => stablecoin => amount
    mapping(address => mapping(address => uint)) public deposits;

    // user => native tokens amount
    mapping(address => uint) public nativeDeposits;

    struct Balance {
        uint amountIn; // in USD, 1e18 is $1
        uint tokenAmountOut;
    }

    mapping(address => Balance) public balances;

    address public convert;

    address public token;
    uint public tokenCourse; // in USD, 1e18 is $1
    uint public tokenAmount;

    uint public startTimestamp; // start exchange time
    uint public endTimestamp; // end exchange time

    address public priceFeed; // native price in USD

    constructor(
        address convert_,
        address token_,
        uint tokenCourse_, // in USD, 1e18 is $1
        uint tokenAmount_, // for example, 800,000e18 tokens
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
            require(stableCoins_[i] != address(0), "Exchange::Constructor: stable coin address is 0");

            stableCoins.push(stableCoins_[i]);
            allowedStableCoins[stableCoins_[i]] = true;
        }

        startTimestamp = startTimestamp_;
        endTimestamp = endTimestamp_;

        priceFeed = priceFeed_;
    }

    function deposit(address stableCoin_, uint amount) public returns (bool) {
        require(getTimeStamp() < startTimestamp, "Exchange::deposit: bad timing for the request");
        require(checkDepositPToken(msg.sender), "Exchange::deposit: deposit in convert is null");
        require(allowedStableCoins[stableCoin_], "Exchange::deposit: this stable coin is not allowed");

        uint amountIn = doTransferIn(msg.sender, stableCoin_, amount);

        deposits[msg.sender][stableCoin_] += amountIn;

        uint USDAmountIn = amount * 1e18 / (10 ** ERC20(stableCoin_).decimals()); // 1e18 is normalize

        balances[msg.sender].amountIn += USDAmountIn;

        return true;
    }

    function depositNative() public payable returns (bool) {
        require(getTimeStamp() < startTimestamp, "Exchange::depositNative: bad timing for the request");
        require(checkDepositPToken(msg.sender), "Exchange::depositNative: deposit in convert is null");

        nativeDeposits[msg.sender] += msg.value;

        uint USDAmountIn = msg.value * uint(AggregatorInterface(priceFeed).latestAnswer()) / 1e8; // 1e8 is chainlink, also optimize: div 1e18 is native decimals, mul 1e18 is normalize

        balances[msg.sender].amountIn += USDAmountIn;

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

    function calcTokenAmountMax(address user) public view returns (uint) {
        uint userPTokenAmount = ConvertInterface(convert).getPTokenInAmount(user);
        address pToken = ConvertInterface(convert).pTokenFrom();

        return userPTokenAmount * tokenAmount / ERC20(pToken).balanceOf(convert);
    }

    function getTimeStamp() public view returns (uint) {
        return block.timestamp;
    }

    function transferOut(address payable user, uint returnUSDValue) internal {
        uint NativeValue = nativeDeposits[user];
        uint returnValueInUSD = returnUSDValue;

        if (NativeValue > 0) {
            uint NativeUSDPrice = uint(AggregatorInterface(priceFeed).latestAnswer());
            uint amountETHInUSD = NativeValue * NativeUSDPrice / 1e8; // 1e8 is chainlink, also missed: div 1e18 is eth, mul 1e18 is normalize

            if (amountETHInUSD > returnValueInUSD) {
                user.transfer(returnValueInUSD * 1e8 / NativeUSDPrice);
            } else {
                user.transfer(NativeValue);
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
}
