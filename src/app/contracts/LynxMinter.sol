// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
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

    event DebugMint(string message, uint256 value1, uint256 value2);
    event DebugConfirmMint(string message, address sender, address owner, uint256 nonce, bool isPending);
    event DebugOwner(string message, address msgSender, address contractOwner);

    // Add tracking for total deposits
    uint256 public totalHbarDeposited;
    uint256 public totalLynxMinted;
    uint256 public mintNonce;

    // Mapping to track pending mints
    mapping(uint256 => bool) public pendingMints;

    error ReentrancyGuardReentrantCall();
    error OnlyOwner();

    constructor(
        address _lynxToken,
        address _sauceToken,
        address _clxyToken
    ) {
        require(_lynxToken != address(0), "LYNX token address cannot be zero");
        require(_sauceToken != address(0), "SAUCE token address cannot be zero");
        require(_clxyToken != address(0), "CLXY token address cannot be zero");

        owner = msg.sender;
        _status = _NOT_ENTERED;
        lynxToken = _lynxToken;
        sauceToken = _sauceToken;
        clxyToken = _clxyToken;
        mintNonce = 0;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            emit DebugOwner("Not owner", msg.sender, owner);
            revert OnlyOwner();
        }
        _;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    function mint(uint256 amount) external payable nonReentrant {
        require(msg.value >= amount, "Insufficient HBAR sent");
        require(amount > 0, "Amount must be greater than 0");

        // Increment nonce first
        uint256 currentNonce = mintNonce;
        mintNonce = currentNonce + 1;

        // Mark mint as pending
        pendingMints[currentNonce] = true;

        emit DebugMint("Mint initiated", amount, currentNonce);
    }

    function confirmMint(uint256 nonce, uint256 amount) external onlyOwner nonReentrant {
        require(pendingMints[nonce], "No pending mint with this nonce");
        emit DebugConfirmMint("Confirming mint", msg.sender, owner, nonce, pendingMints[nonce]);

        // Clear pending mint
        pendingMints[nonce] = false;

        // Update totals
        totalHbarDeposited += amount;
        totalLynxMinted += amount;

        emit LynxMinted(msg.sender, amount, 0, 0, amount, nonce);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getMaxMintableAmount() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient HBAR balance");
        payable(owner).transfer(amount);
    }
} 