// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SIPManager
 * @notice Manages Systematic Investment Plans (SIP) with automated deposits
 * @dev Integrates with Reactive Network for event-driven automation
 */
contract SIPManager is ReentrancyGuard, Ownable {
    
    struct SIPPlan {
        address user;
        address token;
        uint256 depositAmount;
        uint256 frequency; // in seconds (e.g., 86400 for daily, 2592000 for monthly)
        uint256 lastDepositTime;
        uint256 totalDeposited;
        uint256 totalYieldEarned;
        bool isActive;
        string planName;
        uint256 createdAt;
    }

    struct Portfolio {
        uint256 totalInvested;
        uint256 totalYield;
        uint256 activePlans;
        mapping(uint256 => bool) planIds;
    }

    // State variables
    mapping(uint256 => SIPPlan) public sipPlans;
    mapping(address => Portfolio) public userPortfolios;
    mapping(address => uint256[]) public userPlanIds;
    
    uint256 public nextPlanId;
    uint256 public totalPlansCreated;
    uint256 public totalValueLocked;
    
    address public callbackSender;
    address public yieldPool; // Address where funds are deposited for yield
    
    // Constants
    uint256 public constant MIN_DEPOSIT = 1e18; // 1 token minimum
    uint256 public constant MAX_FREQUENCY = 365 days;
    uint256 public constant MIN_FREQUENCY = 1 days;
    
    // Events
    event SIPCreated(
        uint256 indexed planId,
        address indexed user,
        address token,
        uint256 depositAmount,
        uint256 frequency,
        string planName
    );
    
    event SIPDeposit(
        uint256 indexed planId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event SIPCancelled(uint256 indexed planId, address indexed user);
    event SIPPaused(uint256 indexed planId, address indexed user);
    event SIPResumed(uint256 indexed planId, address indexed user);
    event YieldDistributed(uint256 indexed planId, uint256 yieldAmount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(address _callbackSender, address _yieldPool) {
        callbackSender = _callbackSender;
        yieldPool = _yieldPool;
        nextPlanId = 1;
    }

    /**
     * @notice Create a new SIP plan
     * @param token Token address for the SIP
     * @param depositAmount Amount to deposit per interval
     * @param frequency Deposit frequency in seconds
     * @param planName Name for the SIP plan
     */
    function createSIP(
        address token,
        uint256 depositAmount,
        uint256 frequency,
        string memory planName
    ) external nonReentrant returns (uint256) {
        require(depositAmount >= MIN_DEPOSIT, "Deposit amount too low");
        require(frequency >= MIN_FREQUENCY && frequency <= MAX_FREQUENCY, "Invalid frequency");
        require(token != address(0), "Invalid token address");

        uint256 planId = nextPlanId++;
        
        sipPlans[planId] = SIPPlan({
            user: msg.sender,
            token: token,
            depositAmount: depositAmount,
            frequency: frequency,
            lastDepositTime: block.timestamp,
            totalDeposited: 0,
            totalYieldEarned: 0,
            isActive: true,
            planName: planName,
            createdAt: block.timestamp
        });

        userPlanIds[msg.sender].push(planId);
        userPortfolios[msg.sender].activePlans++;
        userPortfolios[msg.sender].planIds[planId] = true;
        
        totalPlansCreated++;

        emit SIPCreated(planId, msg.sender, token, depositAmount, frequency, planName);
        
        return planId;
    }

    /**
     * @notice Execute a SIP deposit (called by Reactive Network or user)
     * @param planId The SIP plan ID
     */
    function executeSIPDeposit(uint256 planId) external nonReentrant {
        SIPPlan storage plan = sipPlans[planId];
        
        require(plan.isActive, "SIP plan not active");
        require(block.timestamp >= plan.lastDepositTime + plan.frequency, "Too early for deposit");
        
        IERC20 token = IERC20(plan.token);
        
        // Transfer tokens from user to this contract
        require(
            token.transferFrom(plan.user, address(this), plan.depositAmount),
            "Transfer failed"
        );
        
        // Update plan state
        plan.lastDepositTime = block.timestamp;
        plan.totalDeposited += plan.depositAmount;
        
        // Update portfolio
        userPortfolios[plan.user].totalInvested += plan.depositAmount;
        totalValueLocked += plan.depositAmount;
        
        // Transfer to yield pool
        token.transfer(yieldPool, plan.depositAmount);
        
        emit SIPDeposit(planId, plan.user, plan.depositAmount, block.timestamp);
    }

    /**
     * @notice Batch execute multiple SIP deposits
     * @param planIds Array of plan IDs to execute
     */
    function batchExecuteSIPDeposits(uint256[] calldata planIds) external nonReentrant {
        for (uint256 i = 0; i < planIds.length; i++) {
            SIPPlan storage plan = sipPlans[planIds[i]];
            
            if (plan.isActive && block.timestamp >= plan.lastDepositTime + plan.frequency) {
                IERC20 token = IERC20(plan.token);
                
                if (token.transferFrom(plan.user, address(this), plan.depositAmount)) {
                    plan.lastDepositTime = block.timestamp;
                    plan.totalDeposited += plan.depositAmount;
                    userPortfolios[plan.user].totalInvested += plan.depositAmount;
                    totalValueLocked += plan.depositAmount;
                    token.transfer(yieldPool, plan.depositAmount);
                    
                    emit SIPDeposit(planIds[i], plan.user, plan.depositAmount, block.timestamp);
                }
            }
        }
    }

    /**
     * @notice Pause a SIP plan
     * @param planId The SIP plan ID
     */
    function pauseSIP(uint256 planId) external {
        SIPPlan storage plan = sipPlans[planId];
        require(plan.user == msg.sender, "Not plan owner");
        require(plan.isActive, "Plan already inactive");
        
        plan.isActive = false;
        userPortfolios[msg.sender].activePlans--;
        
        emit SIPPaused(planId, msg.sender);
    }

    /**
     * @notice Resume a paused SIP plan
     * @param planId The SIP plan ID
     */
    function resumeSIP(uint256 planId) external {
        SIPPlan storage plan = sipPlans[planId];
        require(plan.user == msg.sender, "Not plan owner");
        require(!plan.isActive, "Plan already active");
        
        plan.isActive = true;
        plan.lastDepositTime = block.timestamp; // Reset timer
        userPortfolios[msg.sender].activePlans++;
        
        emit SIPResumed(planId, msg.sender);
    }

    /**
     * @notice Cancel a SIP plan
     * @param planId The SIP plan ID
     */
    function cancelSIP(uint256 planId) external {
        SIPPlan storage plan = sipPlans[planId];
        require(plan.user == msg.sender, "Not plan owner");
        
        if (plan.isActive) {
            userPortfolios[msg.sender].activePlans--;
        }
        
        plan.isActive = false;
        userPortfolios[msg.sender].planIds[planId] = false;
        
        emit SIPCancelled(planId, msg.sender);
    }

    /**
     * @notice Distribute yield to a SIP plan
     * @param planId The SIP plan ID
     * @param yieldAmount Amount of yield to distribute
     */
    function distributeYield(uint256 planId, uint256 yieldAmount) external {
        require(msg.sender == yieldPool || msg.sender == owner(), "Unauthorized");
        
        SIPPlan storage plan = sipPlans[planId];
        plan.totalYieldEarned += yieldAmount;
        userPortfolios[plan.user].totalYield += yieldAmount;
        
        emit YieldDistributed(planId, yieldAmount);
    }

    /**
     * @notice Emergency withdraw for user
     * @param planId The SIP plan ID
     */
    function emergencyWithdraw(uint256 planId) external nonReentrant {
        SIPPlan storage plan = sipPlans[planId];
        require(plan.user == msg.sender, "Not plan owner");
        
        plan.isActive = false;
        
        // This would trigger withdrawal from yield pool
        // Implementation depends on yield pool contract
        
        emit EmergencyWithdraw(msg.sender, plan.totalDeposited);
    }

    /**
     * @notice Get user's SIP plan IDs
     * @param user User address
     */
    function getUserPlans(address user) external view returns (uint256[] memory) {
        return userPlanIds[user];
    }

    /**
     * @notice Get SIP plan details
     * @param planId The SIP plan ID
     */
    function getSIPPlan(uint256 planId) external view returns (
        address user,
        address token,
        uint256 depositAmount,
        uint256 frequency,
        uint256 lastDepositTime,
        uint256 totalDeposited,
        uint256 totalYieldEarned,
        bool isActive,
        string memory planName,
        uint256 createdAt
    ) {
        SIPPlan memory plan = sipPlans[planId];
        return (
            plan.user,
            plan.token,
            plan.depositAmount,
            plan.frequency,
            plan.lastDepositTime,
            plan.totalDeposited,
            plan.totalYieldEarned,
            plan.isActive,
            plan.planName,
            plan.createdAt
        );
    }

    /**
     * @notice Get user portfolio summary
     * @param user User address
     */
    function getPortfolio(address user) external view returns (
        uint256 totalInvested,
        uint256 totalYield,
        uint256 activePlans
    ) {
        Portfolio storage portfolio = userPortfolios[user];
        return (
            portfolio.totalInvested,
            portfolio.totalYield,
            portfolio.activePlans
        );
    }

    /**
     * @notice Check if SIP deposit is due
     * @param planId The SIP plan ID
     */
    function isDepositDue(uint256 planId) external view returns (bool) {
        SIPPlan memory plan = sipPlans[planId];
        return plan.isActive && block.timestamp >= plan.lastDepositTime + plan.frequency;
    }

    /**
     * @notice Update yield pool address
     * @param newYieldPool New yield pool address
     */
    function setYieldPool(address newYieldPool) external onlyOwner {
        require(newYieldPool != address(0), "Invalid address");
        yieldPool = newYieldPool;
    }

    /**
     * @notice Update callback sender address
     * @param newCallbackSender New callback sender address
     */
    function setCallbackSender(address newCallbackSender) external onlyOwner {
        require(newCallbackSender != address(0), "Invalid address");
        callbackSender = newCallbackSender;
    }
}
