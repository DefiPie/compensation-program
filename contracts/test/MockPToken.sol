// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MockPToken is ERC20 {
    uint public borrowBalance;

    constructor(
        uint256 initialSupply,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    function borrowBalanceStored(address account) external view returns (uint) {
        account; // remove warnings
        return borrowBalance;
    }

    function setBorrowBalanceStored(uint borrowBalance_) external {
        borrowBalance = borrowBalance_;
    }

    function underlying() external view returns (address) {
        return address(this);
    }
}
