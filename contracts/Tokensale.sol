// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./Services/ERC20.sol";
import "./Services/Transfers.sol";
import "./Services/Interfaces.sol";

contract Tokensale is Transfers, Ownable {

    address[] public stableCoins;
    mapping(address => bool) public allowedStableCoins;

    // user => stablecoin => amount
    mapping(address => mapping(address => uint)) public stableDeposits;

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
    uint public exchangeTokenAmount;

    uint public startTimestamp; // start exchange time
    uint public endTimestamp; // end exchange time

    address public priceFeed; // native price in USD

    constructor(
        address convert_,
        address token_,
        uint tokenCourse_, // in USD, 1e18 is $1
        uint exchangeTokenAmount_, // for example, 800,000e18 tokens
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
        exchangeTokenAmount = exchangeTokenAmount_;

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
        require(checkPTokenDeposit(msg.sender), "Exchange::deposit: deposit in convert is null");
        require(allowedStableCoins[stableCoin_], "Exchange::deposit: this stable coin is not allowed");

        uint amountIn = doTransferIn(msg.sender, stableCoin_, amount);

        stableDeposits[msg.sender][stableCoin_] += amountIn;

        uint USDAmountIn = amount * 1e18 / (10 ** ERC20(stableCoin_).decimals()); // 1e18 is normalize

        balances[msg.sender].amountIn += USDAmountIn;

        return true;
    }

    function depositNative() public payable returns (bool) {
        require(getTimeStamp() < startTimestamp, "Exchange::depositNative: bad timing for the request");
        require(checkPTokenDeposit(msg.sender), "Exchange::depositNative: deposit in convert is null");

        nativeDeposits[msg.sender] += msg.value;

        uint USDAmountIn = msg.value * uint(AggregatorInterface(priceFeed).latestAnswer()) / 1e8; // 1e8 is chainlink, also optimize: div 1e18 is native decimals, mul 1e18 is normalize price

        balances[msg.sender].amountIn += USDAmountIn;

        return true;
    }

    function claim() public returns (bool) {
        require(getTimeStamp() > startTimestamp, "Exchange::claim: bad timing for the request");
        uint amount = calcClaimAmount(msg.sender);

        if (amount == 0) {
            return true;
        }

        balances[msg.sender].tokenAmountOut += amount;

        doTransferOut(token, msg.sender, amount);

        uint totalAmountIn = balances[msg.sender].amountIn;
        uint totalTokenPrice = amount * tokenCourse / (10 ** ERC20(token).decimals());
        uint returnUSDValue;

        if (totalAmountIn > totalTokenPrice) {
            returnUSDValue = totalAmountIn - totalTokenPrice;
            returnUnusedDeposit(payable(msg.sender), returnUSDValue);
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

    function checkPTokenDeposit(address user) public view returns (bool) {
        return ConvertInterface(convert).getPTokenInAmount(user) > 0 ? true : false;
    }

    function calcExchangeMaxTokenAmount(address user) public view returns (uint) {
        uint userPTokenAmount = ConvertInterface(convert).getPTokenInAmount(user);

        return userPTokenAmount * exchangeTokenAmount / ConvertInterface(convert).pTokenFromTotalAmount();
    }

    function calcClaimAmount(address user) public view returns (uint) {
        uint amountMax = calcExchangeMaxTokenAmount(user);
        uint maxDeposit = amountMax * tokenCourse / (10 ** uint(ERC20(token).decimals())); // max in USD, 1e18 is for token course, 10** is decimals for token amountMax
        uint claimAmount;

        if (maxDeposit > balances[msg.sender].amountIn) {
            claimAmount = (10 ** uint(ERC20(token).decimals())) * balances[msg.sender].amountIn / tokenCourse;
        } else {
            claimAmount = amountMax;
        }

        uint tokenAmountOut = balances[msg.sender].tokenAmountOut;

        return claimAmount - tokenAmountOut;
    }

    function getTimeStamp() public view returns (uint) {
        return block.timestamp;
    }

    function returnUnusedDeposit(address payable user, uint USDValue) internal {
        uint nativeValue = nativeDeposits[user];
        uint returnUSDValue = USDValue;

        if (nativeValue > 0) {
            uint nativeUSDPrice = uint(AggregatorInterface(priceFeed).latestAnswer());
            uint nativeAmountInUSD = nativeValue * nativeUSDPrice / 1e8; // 1e8 is chainlink, also optimize: div 1e18 is native, mul 1e18 is normalize price

            if (nativeAmountInUSD >= returnUSDValue) {
                user.transfer(returnUSDValue * 1e8 / nativeUSDPrice); // 1e8 is chainlink, also optimize: mul 1e18 is native, div 1e18 is normalize price
                returnUSDValue = 0;
            } else {
                user.transfer(nativeValue);
                returnUSDValue -= nativeAmountInUSD;
            }
        }

        if (returnUSDValue > 0) {
            for(uint i = 0; i < stableCoins.length; i++) {
                uint amountInStable = stableDeposits[user][stableCoins[i]];

                if (amountInStable > 0) {
                    uint amountStableInUSD = amountInStable * 1e18 / (10 ** ERC20(stableCoins[i]).decimals()); // mul 1e18 is normalize price

                    if (amountStableInUSD > returnUSDValue) {
                        doTransferOut(stableCoins[i], user, returnUSDValue * (10 ** ERC20(stableCoins[i]).decimals()) / 1e18); // div 1e18 is normalize price
                        break;
                    } else {
                        doTransferOut(stableCoins[i], user, amountInStable);
                        returnUSDValue -= amountStableInUSD;
                    }
                } else {
                    continue;
                }
            }
        }
    }
}
