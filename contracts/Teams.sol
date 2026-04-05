// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Teams {
    function getTeamName(uint8 _id) public pure returns (string memory) {
            if (_id <= 3) {
                if (_id == 0) return "Mexico";
                if (_id == 1) return "South Korea";
                if (_id == 2) return "South Africa";
                return "Czech Republic";
            }
            if (_id <= 7) {
                if (_id == 4) return "Canada";
                if (_id == 5) return "Switzerland";
                if (_id == 6) return "Qatar";
                return "Bosnia and Herzegovina";
            }
            if (_id <= 11) {
                if (_id == 8) return "Brazil";
                if (_id == 9) return "Morocco";
                if (_id == 10) return "Scotland";
                return "Haiti";
            }
            if (_id <= 15) {
                if (_id == 12) return "United States";
                if (_id == 13) return "Australia";
                if (_id == 14) return "Paraguay";
                return "T\u00fcrkiye";
            }
            if (_id <= 19) {
                if (_id == 16) return "Germany";
                if (_id == 17) return "Ecuador";
                if (_id == 18) return "Ivory Coast";
                return "Curacao";
            }
            if (_id <= 23) {
                if (_id == 20) return "Netherlands";
                if (_id == 21) return "Japan";
                if (_id == 22) return "Tunisia";
                return "Sweden";
            }
            if (_id <= 27) {
                if (_id == 24) return "Belgium";
                if (_id == 25) return "Iran";
                if (_id == 26) return "Egypt";
                return "New Zealand";
            }
            if (_id <= 31) {
                if (_id == 28) return "Spain";
                if (_id == 29) return "Uruguay";
                if (_id == 30) return "Saudi Arabia";
                return "Cape Verde";
            }
            if (_id <= 35) {
                if (_id == 32) return "France";
                if (_id == 33) return "Senegal";
                if (_id == 34) return "Norway";
                return "Iraq";
            }
            if (_id <= 39) {
                if (_id == 36) return "Argentina";
                if (_id == 37) return "Austria";
                if (_id == 38) return "Algeria";
                return "Jordan";
            }
            if (_id <= 43) {
                if (_id == 40) return "Portugal";
                if (_id == 41) return "Colombia";
                if (_id == 42) return "Uzbekistan";
                return "DR Congo";
            }
            if (_id <= 47) {
                if (_id == 44) return "England";
                if (_id == 45) return "Croatia";
                if (_id == 46) return "Panama";
                return "Ghana";
            }
            revert("Invalid ID");
        }
}