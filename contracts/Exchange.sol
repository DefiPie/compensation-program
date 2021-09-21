//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Services/ERC20.sol";
import "./Services/Service.sol";

contract Exchange {
    address public convert;
    address public token;
    uint public tokenCourse;
    address[] public stableCoins;
    uint public startTimestamp;
    uint public endTimestamp;

    constructor(
        address convert_,
        address token_,
        uint tokenCourse_,
        address[] memory stableCoins_,
        uint startTimestamp_,
        uint endTimestamp_
    ) {
        require(
            convert_ != address(0)
            && token_ != address(0),
            "Round::Constructor: address is 0"
        );

        require(
            startTimestamp_ != 0
            && endTimestamp_ != 0,
            "Round::Constructor: timestamp num is 0"
        );

        require(
            startTimestamp_ > block.timestamp
            && startTimestamp_ < endTimestamp_,
            "Round::Constructor: start timestamp must be more than current timestamp and less than end timestamp"
        );

        convert = convert_;

        token = token_;
        tokenCourse = tokenCourse_;

        for(uint i = 0; i < stableCoins_.length; i++) {
            stableCoins.push(stableCoins_[i]);
        }

        startTimestamp = startTimestamp_;
        endTimestamp = endTimestamp_;
    }



}
