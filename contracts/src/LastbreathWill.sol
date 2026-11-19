// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 *  LastbreathWill — the treasury and the will of the Lastbreath agent ($BREATH).
 *
 *  How it works
 *  - The treasury is simply this contract's $BREATH balance. Buybacks (30% of the Pons
 *    creator fee) are bought by the agent wallet and sent here with a normal transfer.
 *  - Nobody can withdraw the treasury. Tokens only leave through claim().
 *  - When a generation dies, the agent publishes a snapshot (who held, who saved it)
 *    as a Merkle tree and calls settle(root, payout). payout may be at most 90% of the
 *    free treasury (70% holders + 20% saviors); the remaining ≥10% stays here as seed
 *    money for the next generation.
 *  - Each heir claims their share with a Merkle proof. Shares not claimed within
 *    CLAIM_WINDOW can be released back to the treasury by anyone (they feed the next life).
 *
 *  Trust: the agent decides the snapshot. Every snapshot (the full list of amounts and
 *  the root) is published so anyone can recompute and check it before claiming.
 *
 *  Leaves use the OpenZeppelin StandardMerkleTree format:
 *    leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
 *  and pairs are hashed sorted (commutative), like OpenZeppelin MerkleProof.
 *
 *  ⚠️ Unaudited. Deploy on testnet first and review before holding real funds.
 */

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

contract LastbreathWill {
    // ---------------------------------------------------------------- config
    IERC20 public immutable token;
    uint256 public constant PAYOUT_BPS = 9_000; // max 90% of the free treasury per death
    uint256 public constant CLAIM_WINDOW = 90 days;

    address public owner;
    address public agent;

    // ---------------------------------------------------------------- state
    struct Will {
        bytes32 root;     // Merkle root of (account, amount)
        uint256 payout;   // total reserved for this will
        uint256 claimed;  // total claimed so far
        uint64 settledAt; // timestamp of settle()
        bool released;    // unclaimed rest returned to the treasury
    }

    uint256 public currentGeneration = 1; // generation that is alive now
    uint256 public locked;                // sum of reserved-but-unclaimed payouts
    mapping(uint256 => Will) public wills; // generation => will
    mapping(uint256 => mapping(address => bool)) private _claimed;

    // ---------------------------------------------------------------- events
    event Settled(uint256 indexed generation, bytes32 root, uint256 payout, string snapshotURI);
    event Claimed(uint256 indexed generation, address indexed account, uint256 amount);
    event Released(uint256 indexed generation, uint256 amount);
    event AgentChanged(address agent);
    event OwnerChanged(address owner);

    error NotOwner();
    error NotAgent();
    error PayoutTooHigh(uint256 payout, uint256 max);
    error NothingToSettle();
    error AlreadyClaimed();
    error InvalidProof();
    error UnknownWill();
    error WindowOpen();
    error WindowClosed();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(IERC20 token_, address agent_) {
        if (address(token_) == address(0) || agent_ == address(0)) revert ZeroAddress();
        token = token_;
        owner = msg.sender;
        agent = agent_;
        emit OwnerChanged(msg.sender);
        emit AgentChanged(agent_);
    }

    // ---------------------------------------------------------------- views
    /// @notice Treasury that belongs to the living generation (balance minus open wills).
    function freeBalance() public view returns (uint256) {
        uint256 bal = token.balanceOf(address(this));
        return bal > locked ? bal - locked : 0;
    }

    /// @notice The most the next settle() may pay out.
    function maxPayout() public view returns (uint256) {
        return (freeBalance() * PAYOUT_BPS) / 10_000;
    }

    function isClaimed(uint256 generation, address account) external view returns (bool) {
        return _claimed[generation][account];
    }

    // ---------------------------------------------------------------- death
    /// @notice Record the will of the generation that just died and start the next one.
    /// @param root Merkle root of every heir's (account, amount).
    /// @param payout Sum of all amounts in the tree. At most 90% of the free treasury.
    /// @param snapshotURI Where the full snapshot is published (for anyone to verify).
    function settle(bytes32 root, uint256 payout, string calldata snapshotURI) external onlyAgent {
        if (root == bytes32(0) || payout == 0) revert NothingToSettle();
        uint256 max = maxPayout();
        if (payout > max) revert PayoutTooHigh(payout, max);

        uint256 gen = currentGeneration;
        wills[gen] = Will({ root: root, payout: payout, claimed: 0, settledAt: uint64(block.timestamp), released: false });
        locked += payout;
        currentGeneration = gen + 1;

        emit Settled(gen, root, payout, snapshotURI);
    }

    // ---------------------------------------------------------------- heirs
    function claim(uint256 generation, address account, uint256 amount, bytes32[] calldata proof) external {
        Will storage w = wills[generation];
        if (w.root == bytes32(0)) revert UnknownWill();
        if (w.released || block.timestamp > w.settledAt + CLAIM_WINDOW) revert WindowClosed();
        if (_claimed[generation][account]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        if (!_verify(proof, w.root, leaf)) revert InvalidProof();

        _claimed[generation][account] = true;
        w.claimed += amount;
        locked -= amount;
        if (!token.transfer(account, amount)) revert TransferFailed();

        emit Claimed(generation, account, amount);
    }

    /// @notice After the claim window, unclaimed shares go back to the treasury of the living.
    function release(uint256 generation) external {
        Will storage w = wills[generation];
        if (w.root == bytes32(0)) revert UnknownWill();
        if (w.released) revert WindowClosed();
        if (block.timestamp <= w.settledAt + CLAIM_WINDOW) revert WindowOpen();

        w.released = true;
        uint256 rest = w.payout - w.claimed;
        locked -= rest;
        emit Released(generation, rest);
    }

    // ---------------------------------------------------------------- admin
    function setAgent(address agent_) external onlyOwner {
        if (agent_ == address(0)) revert ZeroAddress();
        agent = agent_;
        emit AgentChanged(agent_);
    }

    function transferOwnership(address owner_) external onlyOwner {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        emit OwnerChanged(owner_);
    }

    // ---------------------------------------------------------------- merkle
    function _verify(bytes32[] calldata proof, bytes32 root, bytes32 leaf) private pure returns (bool) {
        bytes32 h = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            h = h < p ? keccak256(abi.encodePacked(h, p)) : keccak256(abi.encodePacked(p, h));
        }
        return h == root;
    }
}
