// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HederaEthereumMapping {
    mapping(string => address) public hederaToEthereum;

    function associate(string memory hederaAccountId, address ethereumAddress) public {
        hederaToEthereum[hederaAccountId] = ethereumAddress;
    }

    function getEthereumAddress(string memory hederaAccountId) public view returns (address) {
        return hederaToEthereum[hederaAccountId];
    }
}
