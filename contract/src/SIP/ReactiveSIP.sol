// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.8.0;

import '../IReactive.sol';
import '../AbstractReactive.sol';
import '../ISystemContract.sol';

/**
 * @title ReactiveSIP
 * @notice Reactive Network contract for automated SIP execution
 * @dev Monitors blockchain events and triggers SIP deposits automatically
 */
contract ReactiveSIP is IReactive, AbstractReactive {
    
    struct SIPConfig {
        address sipManager;
        address token;
        uint256 chainId;
    }

    // Events
    event SIPDepositTriggered(uint256 indexed planId, address indexed user, uint256 timestamp);
    event TimeBasedTrigger(uint256 indexed planId, uint256 timestamp);
    event EmergencyTriggered(address indexed user, string reason);

    // State variables
    SIPConfig public config;
    
    // Topic hashes for monitoring
    uint256 private constant APPROVAL_TOPIC = 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925;
    uint256 private constant TRANSFER_TOPIC = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef;
    uint256 private constant SIP_CREATED_TOPIC = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef; // Custom topic
    
    uint64 private constant GAS_LIMIT = 10000000;
    
    // Mapping to track last execution time for rate limiting
    mapping(uint256 => uint256) public lastExecutionTime;
    mapping(address => bool) public authorizedAgents;

    constructor(
        address _systemContract,
        address _sipManager,
        address _token,
        uint256 _chainId
    ) {
        service = ISystemContract(payable(_systemContract));
        
        config = SIPConfig({
            sipManager: _sipManager,
            token: _token,
            chainId: _chainId
        });

        // Subscribe to token approval events
        _subscribeToEvent(_token, APPROVAL_TOPIC);
        
        // Subscribe to token transfer events
        _subscribeToEvent(_token, TRANSFER_TOPIC);
        
        // Subscribe to SIP creation events
        _subscribeToEvent(_sipManager, SIP_CREATED_TOPIC);
        
        // Mark as VM if subscription fails
        vm = false;
    }

    receive() external payable {}

    /**
     * @notice Main reactive function triggered by blockchain events
     * @dev Called by Reactive Network when subscribed events occur
     */
    function react(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata data,
        uint256 block_number,
        uint256 op_code
    ) external vmOnly {
        require(chain_id == config.chainId, "Invalid chain");
        
        // Handle token approval for SIP Manager
        if (topic_0 == APPROVAL_TOPIC && _contract == config.token) {
            _handleApproval(chain_id, topic_1, topic_2, topic_3);
        }
        // Handle token transfers
        else if (topic_0 == TRANSFER_TOPIC && _contract == config.token) {
            _handleTransfer(chain_id, topic_1, topic_2, data);
        }
        // Handle SIP creation
        else if (topic_0 == SIP_CREATED_TOPIC && _contract == config.sipManager) {
            _handleSIPCreation(chain_id, topic_1, data);
        }
    }

    /**
     * @notice Handle token approval events
     * @dev Triggers when user approves SIP Manager to spend tokens
     */
    function _handleApproval(
        uint256 chain_id,
        uint256 tokenOwner,
        uint256 spender,
        uint256 amount
    ) internal {
        // Check if approval is for SIP Manager
        if (address(uint160(spender)) == config.sipManager) {
            // User has approved SIP Manager, check if any SIP deposits are due
            bytes memory payload = abi.encodeWithSignature(
                "checkAndExecuteUserSIPs(address)",
                address(uint160(tokenOwner))
            );
            
            emit Callback(chain_id, config.sipManager, GAS_LIMIT, payload);
        }
    }

    /**
     * @notice Handle token transfer events
     * @dev Can be used for balance tracking and emergency scenarios
     */
    function _handleTransfer(
        uint256 chain_id,
        uint256 from,
        uint256 to,
        bytes calldata data
    ) internal {
        address fromAddr = address(uint160(from));
        address toAddr = address(uint160(to));
        
        // Skip if transfer involves SIP Manager (already handled)
        if (fromAddr == config.sipManager || toAddr == config.sipManager) {
            return;
        }
        
        // Could implement balance monitoring or emergency triggers here
    }

    /**
     * @notice Handle SIP creation events
     * @dev Sets up monitoring for the new SIP plan
     */
    function _handleSIPCreation(
        uint256 chain_id,
        uint256 planId,
        bytes calldata data
    ) internal {
        // Decode plan details from data
        // Initialize monitoring for this plan
        emit SIPDepositTriggered(planId, address(0), block.timestamp);
    }

    /**
     * @notice Trigger SIP deposit execution for a specific plan
     * @param planId The SIP plan ID to execute
     */
    function triggerSIPDeposit(uint256 planId, uint256 chain_id) external {
        require(authorizedAgents[msg.sender] || msg.sender == owner(), "Unauthorized");
        
        // Rate limiting: prevent spam
        require(
            block.timestamp >= lastExecutionTime[planId] + 1 hours,
            "Too frequent"
        );
        
        lastExecutionTime[planId] = block.timestamp;
        
        bytes memory payload = abi.encodeWithSignature(
            "executeSIPDeposit(uint256)",
            planId
        );
        
        emit Callback(chain_id, config.sipManager, GAS_LIMIT, payload);
        emit SIPDepositTriggered(planId, address(0), block.timestamp);
    }

    /**
     * @notice Batch trigger multiple SIP deposits
     * @param planIds Array of plan IDs to execute
     */
    function batchTriggerSIPDeposits(uint256[] calldata planIds, uint256 chain_id) external {
        require(authorizedAgents[msg.sender] || msg.sender == owner(), "Unauthorized");
        
        bytes memory payload = abi.encodeWithSignature(
            "batchExecuteSIPDeposits(uint256[])",
            planIds
        );
        
        emit Callback(chain_id, config.sipManager, GAS_LIMIT, payload);
        
        for (uint256 i = 0; i < planIds.length; i++) {
            emit SIPDepositTriggered(planIds[i], address(0), block.timestamp);
        }
    }

    /**
     * @notice Emergency trigger for fund protection
     * @param user User address to protect
     * @param reason Emergency reason
     */
    function emergencyTrigger(address user, string calldata reason, uint256 chain_id) external {
        require(authorizedAgents[msg.sender] || msg.sender == owner(), "Unauthorized");
        
        // Could trigger emergency withdrawal or fund locking
        bytes memory payload = abi.encodeWithSignature(
            "emergencyProtocol(address,string)",
            user,
            reason
        );
        
        emit Callback(chain_id, config.sipManager, GAS_LIMIT, payload);
        emit EmergencyTriggered(user, reason);
    }

    /**
     * @notice Subscribe to a new event
     * @param contractAddr Contract to monitor
     * @param topic Event topic to monitor
     */
    function _subscribeToEvent(address contractAddr, uint256 topic) internal {
        bytes memory payload = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            config.chainId,
            contractAddr,
            topic,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        
        (bool success,) = address(service).call(payload);
        if (!success) {
            vm = true;
        }
    }

    /**
     * @notice Add authorized agent (e.g., AI agent)
     * @param agent Agent address to authorize
     */
    function addAuthorizedAgent(address agent) external {
        require(msg.sender == owner(), "Only owner");
        authorizedAgents[agent] = true;
    }

    /**
     * @notice Remove authorized agent
     * @param agent Agent address to remove
     */
    function removeAuthorizedAgent(address agent) external {
        require(msg.sender == owner(), "Only owner");
        authorizedAgents[agent] = false;
    }

    /**
     * @notice Update SIP Manager address
     * @param newSIPManager New SIP Manager address
     */
    function updateSIPManager(address newSIPManager) external {
        require(msg.sender == owner(), "Only owner");
        require(newSIPManager != address(0), "Invalid address");
        config.sipManager = newSIPManager;
    }

    /**
     * @notice Update token address
     * @param newToken New token address
     */
    function updateToken(address newToken) external {
        require(msg.sender == owner(), "Only owner");
        require(newToken != address(0), "Invalid address");
        config.token = newToken;
    }

    /**
     * @notice Subscribe to additional events
     * @param contractAddr Contract to monitor
     * @param topic Event topic
     */
    function subscribe(address contractAddr, uint256 topic) external {
        require(msg.sender == owner(), "Only owner");
        _subscribeToEvent(contractAddr, topic);
    }

    /**
     * @notice Unsubscribe from events
     * @param contractAddr Contract address
     * @param topic Event topic
     */
    function unsubscribe(address contractAddr, uint256 topic) external {
        require(msg.sender == owner(), "Only owner");
        
        service.unsubscribe(
            config.chainId,
            contractAddr,
            topic,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    /**
     * @notice Get configuration
     */
    function getConfig() external view returns (
        address sipManager,
        address token,
        uint256 chainId
    ) {
        return (config.sipManager, config.token, config.chainId);
    }

    /**
     * @notice For testing: pretend to be VM
     */
    function pretendVm() external {
        vm = true;
    }

    /**
     * @notice Get owner (from AbstractReactive)
     */
    function owner() internal view returns (address) {
        // Implement owner logic or import Ownable
        return address(this); // Placeholder
    }
}
