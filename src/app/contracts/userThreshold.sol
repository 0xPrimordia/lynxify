// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISaucerSwapV2SwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
    function refundETH() external payable;
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}

interface IHederaTokenService {
    function approveTokenAllowance(address token, address owner, address spender, uint256 amount) external returns (int64);
}

contract userThreshold {
    address public owner;
    uint256 public currentPrice;
    uint256 public constant FEE_BASIS_POINTS = 8; // 0.08% fee
    address public feeCollector;
    
    address constant SAUCERSWAP_ROUTER = address(0x0000000000000000000000000000000000159398);
    address constant HEDERA_TOKEN_SERVICE = address(0x0000000000000000000000000000000000000167);

    struct Threshold {
        uint256 price;              // Price threshold in basis points
        string hederaAccountId;     // User's Hedera account ID
        address tokenA;             // First token in pair
        address tokenB;             // Second token in pair
        uint256 cap;               // Amount to trade
        bool isActive;             // Whether the threshold is active
    }

    mapping(string => Threshold) public userThresholds;

    event ThresholdSet(
        string hederaAccountId,
        uint256 price,
        address tokenA,
        address tokenB, 
        uint256 cap
    );

    event OrderExecuted(
        string hederaAccountId,
        string orderType,
        uint256 currentPrice,
        address tokenA,
        address tokenB,
        uint256 amountOut
    );

    event FeeCollected(address indexed collector, uint256 amount);
    event FeeCalculated(uint256 tradeAmount, uint256 feeAmount, uint256 finalTradeAmount);

    event RouterApprovalResult(
        string message,
        address token,
        uint256 amount,
        int64 result
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _owner) {
        owner = _owner;
        feeCollector = _owner;
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid fee collector address");
        feeCollector = _newCollector;
    }

    function approveRouter(address token, uint256 amount) public {
        int64 result = IHederaTokenService(HEDERA_TOKEN_SERVICE).approveTokenAllowance(
            token,
            address(this),  // owner (the contract)
            SAUCERSWAP_ROUTER,  // spender
            amount
        );
        require(result == 0, "Router approval failed");
    }

    function calculateFee(uint256 amount) public pure returns (uint256) {
        return (amount * FEE_BASIS_POINTS) / 10000;
    }

    function setThreshold(
        uint256 _price,
        string memory _hederaAccountId,
        address _tokenA,
        address _tokenB,
        uint256 _cap
    ) public {
        require(_price > 0 && _price <= 10000, "Price must be between 1 and 10000 basis points");
        require(_cap > 0, "Cap must be greater than zero");
        require(_tokenA != address(0) && _tokenB != address(0), "Token addresses must be valid");
        require(bytes(_hederaAccountId).length > 0, "Hedera account ID must not be empty");
        
        userThresholds[_hederaAccountId] = Threshold(
            _price,
            _hederaAccountId,
            _tokenA,
            _tokenB,
            _cap,
            true
        );

        emit ThresholdSet(
            _hederaAccountId,
            _price,
            _tokenA,
            _tokenB,
            _cap
        );
    }

    function executeTradeForUser(string memory hederaAccountId, string memory orderType, bytes memory path) public payable {
        Threshold storage threshold = userThresholds[hederaAccountId];
        require(threshold.isActive, "User thresholds are not active");

        // Handle fee calculation and collection
        (uint256 tradeAmount) = _handleFees(msg.value);

        // Execute the trade
        uint256 amountOut = _executeSwap(hederaAccountId, tradeAmount, path);

        // Update threshold and emit event
        threshold.isActive = false;
        emit OrderExecuted(
            hederaAccountId,
            orderType,
            currentPrice,
            threshold.tokenA,
            threshold.tokenB,
            amountOut
        );
    }

    function _handleFees(uint256 amount) internal returns (uint256) {
        uint256 feeAmount = calculateFee(amount);
        uint256 tradeAmount = amount - feeAmount;

        emit FeeCalculated(amount, feeAmount, tradeAmount);

        (bool feeSuccess,) = feeCollector.call{value: feeAmount}("");
        require(feeSuccess, "Fee transfer failed");
        emit FeeCollected(feeCollector, feeAmount);

        return tradeAmount;
    }

    function _executeSwap(string memory hederaAccountId, uint256 tradeAmount, bytes memory path) internal returns (uint256) {
        ISaucerSwapV2SwapRouter ROUTER = ISaucerSwapV2SwapRouter(SAUCERSWAP_ROUTER);
        address recipientAddress = _deriveRecipientAddress(hederaAccountId);

        ISaucerSwapV2SwapRouter.ExactInputParams memory params = 
            ISaucerSwapV2SwapRouter.ExactInputParams({
                path: path,
                recipient: recipientAddress,
                deadline: block.timestamp + 60,
                amountIn: tradeAmount,
                amountOutMinimum: 0
            });

        bytes[] memory encodedCalls = new bytes[](2);
        encodedCalls[0] = abi.encodeWithSelector(
            ROUTER.exactInput.selector,
            params
        );
        encodedCalls[1] = abi.encodeWithSelector(
            ROUTER.refundETH.selector
        );

        uint256 amountOut;
        try ROUTER.multicall{value: tradeAmount}(encodedCalls) returns (bytes[] memory results) {
            amountOut = abi.decode(results[0], (uint256));
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Router call failed: ", reason)));
        } catch {
            revert("Router call failed: unknown reason");
        }

        return amountOut;
    }

    function _deriveRecipientAddress(string memory hederaAccountId) internal pure returns (address) {
        string[] memory parts = split(hederaAccountId, ".");
        require(parts.length == 3, "Invalid Hedera account ID format");
        
        uint256 shard = stringToUint(parts[0]);
        uint256 realm = stringToUint(parts[1]);
        uint256 accountNum = stringToUint(parts[2]);
        
        return address(
            uint160(
                (shard << 40) | (realm << 32) | accountNum
            )
        );
    }

    function getThreshold(string memory hederaAccountId) public view returns (
        uint256 price,
        string memory storedHederaId,
        address tokenA,
        address tokenB,
        uint256 cap,
        bool isActive
    ) {
        Threshold memory threshold = userThresholds[hederaAccountId];
        return (
            threshold.price,
            threshold.hederaAccountId,
            threshold.tokenA,
            threshold.tokenB,
            threshold.cap,
            threshold.isActive
        );
    }

    function deactivateThresholds(string memory hederaAccountId) public {
        require(userThresholds[hederaAccountId].isActive, "No active thresholds found");
        userThresholds[hederaAccountId].isActive = false;
    }

    // Helper functions for string manipulation
    function split(string memory _base, string memory _delimiter) internal pure returns (string[] memory) {
        bytes memory baseBytes = bytes(_base);
        uint count = 1;
        for(uint i = 0; i < baseBytes.length; i++) {
            if(baseBytes[i] == bytes(_delimiter)[0]) count++;
        }
        
        string[] memory parts = new string[](count);
        uint start = 0;
        uint partIndex = 0;
        
        for(uint i = 0; i < baseBytes.length; i++) {
            if(baseBytes[i] == bytes(_delimiter)[0]) {
                parts[partIndex] = substring(_base, start, i);
                start = i + 1;
                partIndex++;
            }
        }
        parts[partIndex] = substring(_base, start, baseBytes.length);
        return parts;
    }

    function substring(string memory str, uint startIndex, uint endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex-startIndex);
        for(uint i = startIndex; i < endIndex; i++) {
            result[i-startIndex] = strBytes[i];
        }
        return string(result);
    }

    function stringToUint(string memory s) internal pure returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for(uint i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }
}