// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { LastbreathWill, IERC20 } from "../src/LastbreathWill.sol";
import { TestBreath } from "../src/TestBreath.sol";

// Foundry cheatcodes, declared here so the tests need no extra libraries.
interface Vm {
    function prank(address) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
    function expectRevert() external;
}

contract LastbreathWillTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    TestBreath token;
    LastbreathWill will;
    address agent = address(0xA9E47);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address mallory = address(0xBAD);

    uint256 constant E = 1 ether;

    function setUp() public {
        token = new TestBreath();
        will = new LastbreathWill(IERC20(address(token)), agent);
        token.transfer(address(will), 1000 * E); // the treasury
    }

    // ---- helpers: a 2-leaf tree, built exactly like agent/src/merkle.js
    function _leaf(address a, uint256 amt) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(a, amt))));
    }

    function _pair(bytes32 x, bytes32 y) internal pure returns (bytes32) {
        return x < y ? keccak256(abi.encodePacked(x, y)) : keccak256(abi.encodePacked(y, x));
    }

    function _settle(uint256 a, uint256 b) internal returns (bytes32 root) {
        root = _pair(_leaf(alice, a), _leaf(bob, b));
        vm.prank(agent);
        will.settle(root, a + b, "ipfs://test");
    }

    function _proof(bytes32 sibling) internal pure returns (bytes32[] memory p) {
        p = new bytes32[](1);
        p[0] = sibling;
    }

    // ---- tests
    function test_freeBalanceAndMax() public view {
        require(will.freeBalance() == 1000 * E, "free");
        require(will.maxPayout() == 900 * E, "max 90%");
    }

    function test_settleAndClaimBoth() public {
        _settle(700 * E, 200 * E);
        require(will.currentGeneration() == 2, "next gen");
        require(will.locked() == 900 * E, "locked");
        require(will.freeBalance() == 100 * E, "10% seed stays");

        will.claim(1, alice, 700 * E, _proof(_leaf(bob, 200 * E)));
        will.claim(1, bob, 200 * E, _proof(_leaf(alice, 700 * E)));
        require(token.balanceOf(alice) == 700 * E, "alice paid");
        require(token.balanceOf(bob) == 200 * E, "bob paid");
        require(will.locked() == 0, "unlocked");
        require(will.isClaimed(1, alice) && will.isClaimed(1, bob), "flags");
    }

    function test_anyoneCanSubmitClaimButFundsGoToHeir() public {
        _settle(700 * E, 200 * E);
        vm.prank(mallory);
        will.claim(1, alice, 700 * E, _proof(_leaf(bob, 200 * E)));
        require(token.balanceOf(alice) == 700 * E && token.balanceOf(mallory) == 0, "paid to heir only");
    }

    function test_revertDoubleClaim() public {
        _settle(700 * E, 200 * E);
        will.claim(1, alice, 700 * E, _proof(_leaf(bob, 200 * E)));
        vm.expectRevert(LastbreathWill.AlreadyClaimed.selector);
        will.claim(1, alice, 700 * E, _proof(_leaf(bob, 200 * E)));
    }

    function test_revertWrongAmount() public {
        _settle(700 * E, 200 * E);
        vm.expectRevert(LastbreathWill.InvalidProof.selector);
        will.claim(1, alice, 800 * E, _proof(_leaf(bob, 200 * E)));
    }

    function test_revertStranger() public {
        _settle(700 * E, 200 * E);
        vm.expectRevert(LastbreathWill.InvalidProof.selector);
        will.claim(1, mallory, 700 * E, _proof(_leaf(bob, 200 * E)));
    }

    function test_revertPayoutAbove90() public {
        bytes32 root = _pair(_leaf(alice, 800 * E), _leaf(bob, 101 * E));
        vm.prank(agent);
        vm.expectRevert();
        will.settle(root, 901 * E, "");
    }

    function test_revertSettleNotAgent() public {
        vm.prank(mallory);
        vm.expectRevert(LastbreathWill.NotAgent.selector);
        will.settle(bytes32(uint256(1)), 1, "");
    }

    function test_revertClaimAfterWindow() public {
        _settle(700 * E, 200 * E);
        vm.warp(block.timestamp + 91 days);
        vm.expectRevert(LastbreathWill.WindowClosed.selector);
        will.claim(1, alice, 700 * E, _proof(_leaf(bob, 200 * E)));
    }

    function test_releaseReturnsUnclaimed() public {
        _settle(700 * E, 200 * E);
        will.claim(1, bob, 200 * E, _proof(_leaf(alice, 700 * E)));
        vm.expectRevert(LastbreathWill.WindowOpen.selector);
        will.release(1);
        vm.warp(block.timestamp + 91 days);
        will.release(1);
        require(will.locked() == 0, "unlocked");
        require(will.freeBalance() == 800 * E, "alice's share back to the treasury");
    }

    function test_secondGenerationUsesOnlyFreeTreasury() public {
        _settle(700 * E, 200 * E);
        // gen 2 may only use the 100 left (max 90)
        bytes32 root = _pair(_leaf(alice, 60 * E), _leaf(bob, 30 * E));
        vm.prank(agent);
        will.settle(root, 90 * E, "");
        require(will.currentGeneration() == 3, "gen 3");
        require(will.locked() == 990 * E, "both wills locked");
        // gen 1 claims still work
        will.claim(1, alice, 700 * E, _proof(_leaf(bob, 200 * E)));
        will.claim(2, alice, 60 * E, _proof(_leaf(bob, 30 * E)));
        require(token.balanceOf(alice) == 760 * E, "both wills paid");
    }

    function test_onlyOwnerAdmin() public {
        vm.prank(mallory);
        vm.expectRevert(LastbreathWill.NotOwner.selector);
        will.setAgent(mallory);
        will.setAgent(bob);
        require(will.agent() == bob, "agent changed by owner");
    }
}
