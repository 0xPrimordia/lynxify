// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IHederaTokenService {
    function associateToken(address account, address token) external returns (int responseCode);
    function isTokenAssociated(address account, address token) external view returns (bool);
}

contract LynxMinter {
    address public owner;
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // Token addresses (Hedera format)
    address public lynxToken;
    address public sauceToken;
    address public clxyToken;
    
    uint256 public constant RATIO_PRECISION = 1e8; // 8 decimals to match LYNX
    
    event LynxMinted(
        address indexed user,
        uint256 hbarAmount,
        uint256 sauceAmount,
        uint256 clxyAmount,
        uint256 lynxMinted,
        uint256 nonce
    );

    event SupplyVerified(uint256 hbarBalance, uint256 sauceBalance, uint256 clxyBalance, uint256 lynxSupply);
    event MaxMintableUpdated(uint256 amount);
    event DebugConstructor(address lynx, address sauce, address clxy, address sender);
    event DebugMint(string message, uint256 value1, uint256 value2);
    event DebugConfirmMint(string message, address sender, address owner, uint256 nonce, bool isPending);
    event DebugOwner(string message, address msgSender, address contractOwner);
    event DebugCheckSupply(string message, uint256 hbarBalance, uint256 sauceBalance, uint256 clxyBalance, uint256 totalLynxMinted);

    // Add tracking for total deposits
    uint256 public totalHbarDeposited;
    uint256 public totalSauceDeposited;
    uint256 public totalClxyDeposited;
    uint256 public totalLynxMinted;
    uint256 public mintNonce;

    // Mapping to track pending mints
    mapping(uint256 => bool) public pendingMints;

    error ReentrancyGuardReentrantCall();
    error OnlyOwner();

    address constant PRECOMPILE_ADDRESS = address(0x167);  // HTS precompile address
    IHederaTokenService private hederaTokenService;

    constructor(
        address _lynxToken,
        address _sauceToken,
        address _clxyToken
    ) {
        require(_lynxToken != address(0), "LYNX token address cannot be zero");
        require(_sauceToken != address(0), "SAUCE token address cannot be zero");
        require(_clxyToken != address(0), "CLXY token address cannot be zero");

        emit DebugConstructor(_lynxToken, _sauceToken, _clxyToken, msg.sender);

        owner = msg.sender;
        _status = _NOT_ENTERED;
        lynxToken = _lynxToken;
        sauceToken = _sauceToken;
        clxyToken = _clxyToken;
        hederaTokenService = IHederaTokenService(PRECOMPILE_ADDRESS);
        mintNonce = 0;
    }

    function associateTokens() external onlyOwner {
        require(address(this).balance >= 1e8, "Insufficient HBAR balance for association");

        // Check if tokens are already associated
        bool sauceAssociated = false;
        bool clxyAssociated = false;

        try hederaTokenService.isTokenAssociated(address(this), sauceToken) returns (bool result) {
            sauceAssociated = result;
        } catch {
            // If the call fails, assume not associated
            sauceAssociated = false;
        }

        try hederaTokenService.isTokenAssociated(address(this), clxyToken) returns (bool result) {
            clxyAssociated = result;
        } catch {
            // If the call fails, assume not associated
            clxyAssociated = false;
        }

        // Associate SAUCE token if needed
        if (!sauceAssociated) {
            int response = hederaTokenService.associateToken(address(this), sauceToken);
            require(response == 0, string(abi.encodePacked("SAUCE association failed with code: ", response)));
        }
        
        // Associate CLXY token if needed
        if (!clxyAssociated) {
            int response = hederaTokenService.associateToken(address(this), clxyToken);
            require(response == 0, string(abi.encodePacked("CLXY association failed with code: ", response)));
        }

        // Emit an event for debugging
        emit DebugConstructor(lynxToken, sauceToken, clxyToken, msg.sender);
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyOwner() {
        emit DebugOwner("Checking owner", msg.sender, owner);
        if (msg.sender != owner) {
            revert OnlyOwner();
        }
        _;
    }

    function getMaxMintableAmount() public view returns (uint256) {
        uint256 sauceBalance = IERC20(sauceToken).balanceOf(address(this));
        uint256 clxyBalance = IERC20(clxyToken).balanceOf(address(this));
        uint256 hbarBalance = address(this).balance;

        // Return the minimum of all balances to maintain 1:1:1 ratio
        return min(min(hbarBalance, sauceBalance), clxyBalance);
    }

    function verifySupply() public returns (bool) {
        uint256 hbarBalance = address(this).balance;
        uint256 sauceBalance = IERC20(sauceToken).balanceOf(address(this));
        uint256 clxyBalance = IERC20(clxyToken).balanceOf(address(this));
        uint256 lynxSupply = totalLynxMinted;

        emit SupplyVerified(hbarBalance, sauceBalance, clxyBalance, lynxSupply);
        emit DebugCheckSupply("Checking supply", hbarBalance, sauceBalance, clxyBalance, totalLynxMinted);
        return checkSupply();
    }

    function checkSupply() public view returns (bool) {
        uint256 hbarBalance = address(this).balance;
        uint256 sauceBalance = IERC20(sauceToken).balanceOf(address(this));
        uint256 clxyBalance = IERC20(clxyToken).balanceOf(address(this));

        // For initial state, all balances should be 0
        if (totalLynxMinted == 0) {
            return hbarBalance == 0 && sauceBalance == 0 && clxyBalance == 0;
        }

        // For active state, check proportional balances
        return (hbarBalance == sauceBalance) && 
               (sauceBalance == clxyBalance) && 
               (clxyBalance == totalLynxMinted);
    }

    function mint(uint256 amount) external payable nonReentrant {
        emit DebugMint("Checking msg.value", msg.value, amount);
        require(msg.value == amount, "HBAR amount must match input amount");
        require(amount > 0, "Amount must be greater than 0");

        // Check token balances and allowances
        uint256 sauceAllowance = IERC20(sauceToken).allowance(msg.sender, address(this));
        uint256 clxyAllowance = IERC20(clxyToken).allowance(msg.sender, address(this));
        emit DebugMint("Checking allowances", sauceAllowance, clxyAllowance);
        require(sauceAllowance >= amount, "Insufficient SAUCE allowance");
        require(clxyAllowance >= amount, "Insufficient CLXY allowance");

        // Check sender balances
        uint256 sauceBalance = IERC20(sauceToken).balanceOf(msg.sender);
        uint256 clxyBalance = IERC20(clxyToken).balanceOf(msg.sender);
        emit DebugMint("Checking balances", sauceBalance, clxyBalance);
        require(sauceBalance >= amount, "Insufficient SAUCE balance");
        require(clxyBalance >= amount, "Insufficient CLXY balance");

        // Transfer tokens to contract
        emit DebugMint("Before transfers", amount, 0);
        require(IERC20(sauceToken).transferFrom(msg.sender, address(this), amount), "SAUCE transfer failed");
        require(IERC20(clxyToken).transferFrom(msg.sender, address(this), amount), "CLXY transfer failed");

        // Update deposit tracking
        totalHbarDeposited += msg.value;
        totalSauceDeposited += amount;
        totalClxyDeposited += amount;

        // Mark mint as pending
        uint256 currentNonce = mintNonce++;
        pendingMints[currentNonce] = true;

        // Emit event for the minting service to handle
        emit LynxMinted(msg.sender, amount, amount, amount, amount, currentNonce);
    }

    function confirmMint(uint256 nonce, uint256 amount) external onlyOwner {
        emit DebugConfirmMint("Confirming mint", msg.sender, owner, nonce, pendingMints[nonce]);
        require(pendingMints[nonce], "Mint not pending");
        delete pendingMints[nonce];
        totalLynxMinted += amount;
        require(verifySupply(), "Supply verification failed after minting");
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    // Get contract's HBAR balance
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Emergency withdrawal functions for the owner
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }
    
    function withdrawHBAR(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }
} 