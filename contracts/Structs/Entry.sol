// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Entry {
    // Packed into 2 storage slots (48 bytes + 1 bool)
    bytes4 groupA;
    bytes4 groupB;
    bytes4 groupC;
    bytes4 groupD;
    bytes4 groupE;
    bytes4 groupF;
    bytes4 groupG;
    bytes4 groupH;
    bytes4 groupI;
    bytes4 groupJ;
    bytes4 groupK;
    bytes4 groupL;
    bool exists;
}
