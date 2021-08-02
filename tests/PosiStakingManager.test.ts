import { ethers, waffle } from "hardhat";
import { BigNumber, Signer } from "ethers";
import {expect, use} from "chai"
import {PositionToken} from "../src/types/PositionToken"
import {PosiStakingManager} from "../src/types/PosiStakingManager"
import web3Utils from "web3-utils"

const {deployMockContract, provider, solidity} = waffle
use(solidity)
const [deployer, sender2, sender3, sender4] = provider.getWallets()

const bn2String = (bn: any) => fromWei((bn).toString())
const toWei = (n: string) => web3Utils.toWei(n.toString())
const fromWei = (n: string | BigNumber) => web3Utils.fromWei(n.toString())

describe('PosiStakingManager', function() {
	let accounts: Signer[];
	let positionToken: PositionToken
	let positionStakingManager: PosiStakingManager;
	beforeEach(async function() {
		accounts = await ethers.getSigners()
		const _positionToken = await ethers.getContractFactory(
			"contracts/PositionToken.sol:PositionToken"
		); //(() as unknown) as PositionToken;
		positionToken = ((await _positionToken.deploy()) as unknown) as PositionToken
		const _posiStakingManager = await ethers.getContractFactory(
			"PosiStakingManager"
		)
		positionStakingManager = ((await _posiStakingManager.deploy(positionToken.address, 0, toWei('1'))) as unknown) as PosiStakingManager

		await positionStakingManager.add(100, positionToken.address, 0, 1000, false)
		await positionToken.approve(positionStakingManager.address, ethers.constants.MaxInt256)
	})

	it("should deploy success", async () => {
		expect(positionStakingManager.address).to.not.equal(ethers.constants.AddressZero)
	})

	it("should deposit ok", async () => {
		console.log("Rate",await positionToken.getRate())
		await positionStakingManager.deposit(0, 1000000, ethers.constants.AddressZero)
		await positionStakingManager.updatePool(0)
		console.log("Rate",await positionToken.getRate())
	})

})
