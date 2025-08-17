pragma solidity ^0.8.20;

contract BForwarder {
    address public immutable C;

    constructor(address _C) {
        require(_C != address(0), "C address cannot be zero");
        C = _C;
    }

    receive() external payable {
        payable(C).transfer(msg.value);
    }
}
