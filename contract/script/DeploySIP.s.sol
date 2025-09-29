// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/SIP/SIPManager.sol";
import "../src/SIP/ReactiveSIP.sol";
import "../src/StraightFlashLoan/token.sol";

contract DeploySIP is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address callbackSender = vm.envAddress("CALLBACK_SENDER_ADDR");
        address systemContract = vm.envAddress("SYSTEM_CONTRACT_ADDR");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Token (if not already deployed)
        Token token = new Token();
        console.log("Token deployed at:", address(token));

        // 2. Deploy SIPManager
        SIPManager sipManager = new SIPManager(
            callbackSender,
            address(0) // Yield pool - can be set later
        );
        console.log("SIPManager deployed at:", address(sipManager));

        // 3. Deploy ReactiveSIP on Reactive Network
        ReactiveSIP reactiveSIP = new ReactiveSIP(
            systemContract,
            address(sipManager),
            address(token),
            1597 // Reactive Mainnet Chain ID
        );
        console.log("ReactiveSIP deployed at:", address(reactiveSIP));

        // 4. Mint some tokens for testing
        address deployer = vm.addr(deployerPrivateKey);
        token.mint(deployer, 1000000 * 10**18); // 1M tokens
        console.log("Minted 1M tokens to deployer");

        vm.stopBroadcast();

        // Output deployment addresses
        console.log("\n=== Deployment Summary ===");
        console.log("Token:", address(token));
        console.log("SIPManager:", address(sipManager));
        console.log("ReactiveSIP:", address(reactiveSIP));
        console.log("\nAdd these to your .env file:");
        console.log("TOKEN_ADDRESS=", address(token));
        console.log("SIP_MANAGER_ADDRESS=", address(sipManager));
        console.log("REACTIVE_SIP_ADDRESS=", address(reactiveSIP));
    }
}
