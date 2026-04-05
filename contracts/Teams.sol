// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Teams {
    function getTeamName(uint8 teamId) public pure returns (string memory) {
            if (teamId <= 3) {
                if (teamId == 0) return "Mexico";
                if (teamId == 1) return "South Korea";
                if (teamId == 2) return "South Africa";
                return "Czech Republic";
            }
            if (teamId <= 7) {
                if (teamId == 4) return "Canada";
                if (teamId == 5) return "Switzerland";
                if (teamId == 6) return "Qatar";
                return "Bosnia and Herzegovina";
            }
            if (teamId <= 11) {
                if (teamId == 8) return "Brazil";
                if (teamId == 9) return "Morocco";
                if (teamId == 10) return "Scotland";
                return "Haiti";
            }
            if (teamId <= 15) {
                if (teamId == 12) return "United States";
                if (teamId == 13) return "Australia";
                if (teamId == 14) return "Paraguay";
                return "T\u00fcrkiye";
            }
            if (teamId <= 19) {
                if (teamId == 16) return "Germany";
                if (teamId == 17) return "Ecuador";
                if (teamId == 18) return "Ivory Coast";
                return "Curacao";
            }
            if (teamId <= 23) {
                if (teamId == 20) return "Netherlands";
                if (teamId == 21) return "Japan";
                if (teamId == 22) return "Tunisia";
                return "Sweden";
            }
            if (teamId <= 27) {
                if (teamId == 24) return "Belgium";
                if (teamId == 25) return "Iran";
                if (teamId == 26) return "Egypt";
                return "New Zealand";
            }
            if (teamId <= 31) {
                if (teamId == 28) return "Spain";
                if (teamId == 29) return "Uruguay";
                if (teamId == 30) return "Saudi Arabia";
                return "Cape Verde";
            }
            if (teamId <= 35) {
                if (teamId == 32) return "France";
                if (teamId == 33) return "Senegal";
                if (teamId == 34) return "Norway";
                return "Iraq";
            }
            if (teamId <= 39) {
                if (teamId == 36) return "Argentina";
                if (teamId == 37) return "Austria";
                if (teamId == 38) return "Algeria";
                return "Jordan";
            }
            if (teamId <= 43) {
                if (teamId == 40) return "Portugal";
                if (teamId == 41) return "Colombia";
                if (teamId == 42) return "Uzbekistan";
                return "DR Congo";
            }
            if (teamId <= 47) {
                if (teamId == 44) return "England";
                if (teamId == 45) return "Croatia";
                if (teamId == 46) return "Panama";
                return "Ghana";
            }
            revert("Invalid ID");
        }
}
