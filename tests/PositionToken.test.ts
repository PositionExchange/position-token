import { ethers, waffle } from "hardhat";
import { BigNumber, Signer } from "ethers";
import {expect, use} from "chai"
import {PositionToken} from "../src/types/PositionToken"
import web3Utils from "web3-utils"

const {deployMockContract, provider, solidity} = waffle
use(solidity)
const [deployer, sender2, sender3, sender4] = provider.getWallets()

const bn2String = (bn: any) => fromWei((bn).toString())
const toWei = (n: string) => web3Utils.toWei(n.toString())
const fromWei = (n: string | BigNumber) => web3Utils.fromWei(n.toString())

describe("PositionToken", function () {
  let accounts: Signer[];
  let positionToken: PositionToken;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    const _positionToken = await ethers.getContractFactory(
      "contracts/PositionToken.sol:PositionToken"
    ); //(() as unknown) as PositionToken;
    positionToken = ((await _positionToken.deploy()) as unknown) as PositionToken
  });

  const getTotalSupply = () => positionToken.totalSupply().then(bn2String)
  const getBalanceOf = (address: string) => positionToken.balanceOf(address).then(bn2String)
  const getRate = () => positionToken.getRate().then(n => n.toString());

  it("should deploy success", async function () {
    expect(positionToken.address).to.not.equal(ethers.constants.AddressZero)
    expect(positionToken.address).to.not.equal(undefined)
  })

  it("should mint and burn correctly", async function () {
    const amount = 10000000;
    const balanceOfDeployer = await positionToken.balanceOf(deployer.address).then(bn2String);
    expect((balanceOfDeployer)).to.equal(amount.toString())
    await positionToken.connect(sender2).mint(sender2.address,toWei(amount.toString()));
    expect(await positionToken.balanceOf(sender2.address).then(bn2String)).to.equal(amount.toString())
    expect(await getTotalSupply()).to.equal((amount*2).toString())
    // transfer to sender3
    await positionToken.connect(sender2).transfer(sender3.address, toWei((amount/2).toString()))
    const b3 = (await positionToken.balanceOf(sender3.address).then(bn2String))
    const b2 = (await positionToken.balanceOf(sender2.address).then(bn2String))
    const bDeployer = (await positionToken.balanceOf(deployer.address).then(bn2String))
    await positionToken.connect(sender4).mint(sender4.address, toWei(amount.toString()));
    expect(await getTotalSupply()).to.equal((amount*3).toString())
    expect(await positionToken.balanceOf(sender4.address).then(bn2String)).to.equal((amount.toString()))
    expect(await positionToken.balanceOf(sender3.address).then(bn2String)).to.equal(b3)
    expect(await positionToken.balanceOf(sender2.address).then(bn2String)).to.equal(b2)
    expect(await positionToken.balanceOf(deployer.address).then(bn2String)).to.equal(bDeployer)
    await positionToken.connect(sender4).burn(toWei(amount.toString()));
    expect(await getTotalSupply()).to.equal((amount*2).toString())
    expect(await positionToken.balanceOf(sender4.address).then(bn2String)).to.equal('0')
    expect(await positionToken.balanceOf(sender3.address).then(bn2String)).to.equal(b3)
    expect(await positionToken.balanceOf(sender2.address).then(bn2String)).to.equal(b2)
    expect(await positionToken.balanceOf(deployer.address).then(bn2String)).to.equal(bDeployer)
  });


  it("should register Airdrop amount", async function(){
    const amount = 10*10**6
    await positionToken.connect(sender2).mint(sender2.address, toWei(amount.toString()));
    expect(await getTotalSupply()).to.equal((amount*2).toString())
    expect((await getBalanceOf(deployer.address))).to.equal(amount.toString())
    expect((await getBalanceOf(sender2.address))).to.equal(amount.toString())
    await positionToken.registerAirdropDistribution()
    expect(await getTotalSupply()).to.equal((amount*2 + 10**6).toString())
    expect((await getBalanceOf(deployer.address))).to.equal(amount.toString())
    expect((await getBalanceOf(sender2.address))).to.equal(amount.toString())
  })

  it("should distribute airdrop correctly", async () => {
    const amount = 10*10**6
    await positionToken.registerAirdropDistribution()
    expect(await getTotalSupply()).to.equal((amount + 10**6).toString())
    const airdropAmount = toWei('10000')
    const wallets = provider.getWallets()
    wallets.splice(0, 3)
    await positionToken.distributeAirdrop(wallets.map(wallet => wallet.address), airdropAmount)
    wallets.forEach(async wallet => {
      expect(await getBalanceOf(wallet.address)).to.equal(airdropAmount)
    })
    expect((await getBalanceOf(deployer.address))).to.equal(amount.toString())
  })
  it("should donate correctly", async () => {
    const amount = 10*10**6
    const transferAmount = 1000000
    const totalSupply = Number(await getTotalSupply())
    await positionToken.transfer(sender3.address, toWei(transferAmount.toString()))
    const sender3ShouldReceive = '990990.990990991023631002'//transferAmount*0.99 + (transferAmount*0.99*transferAmount*0.01/totalSupply)
    console.log(await getBalanceOf(deployer.address))
    expect(await getBalanceOf(sender3.address)).to.equal(sender3ShouldReceive.toString())
    const donateAmount = 1000000;
    await positionToken.donate(toWei(donateAmount.toString()))
    const sender3WillReceive = Number(sender3ShouldReceive) * donateAmount / totalSupply;
    expect(await getBalanceOf(sender3.address)).to.equal(
      "1101101.101101101169097159"
    );
    expect(await getTotalSupply()).to.equal(amount.toString())

  })

  it("should lock transfer", async function (){
    await expect(positionToken.connect(sender3).setTransferStatus(true)).to.be
      .revertedWith('Caller is not bot keeper')

    await positionToken.setBotKeeper(sender3.address);
    await expect(positionToken.connect(sender3).setTransferStatus(true)).to.be.emit(positionToken, 'TransferStatusChanged').withArgs(false, true)
		await expect(positionToken.transfer(sender4.address, toWei('1000'))).to.revertedWith('Transfer is paused')

  })

  it('should revert for mint', async () => {
    await expect(positionToken.mint(deployer.address,'1000000000')).to.revertedWith('no authorized')
    await expect(positionToken.connect(sender2).mint(sender2.address, '1000000000')).to.revertedWith('no authorized')
    await expect(positionToken.connect(sender3).mint(sender3.address, '1000000000')).to.revertedWith('no authorized')
    await positionToken.setInsuranceFund(sender3.address)
    await positionToken.connect(sender3).mint(sender3.address,"1000000000000000000");
    expect(await getBalanceOf(sender3.address)).to.equal('1')
    await expect(positionToken.connect(sender2).mint(sender2.address,'1000000000')).to.revertedWith('no authorized')
  })
  it('test sale distribution', async () => {
    const amount = 10000000;
    await expect(positionToken.distributeWhitelistSale(sender3.address, toWei('1000'))).to.revertedWith('not registered')
    // await positionToken.connect(deployer).register
    expect(await getTotalSupply()).to.eq(((amount+amount/2).toString()))

    await expect(positionToken.connect(sender3).distributeWhitelistSale(sender3.address, toWei('1000'))).to.revertedWith('not authorized')
    await (positionToken.connect(deployer).distributeWhitelistSale(sender3.address, toWei('1000')))
    expect(await getBalanceOf(sender3.address)).to.equal(('1000'))
  })

  it("should mint for exclude correctly", async () => {
    const amount = 10000;
    // await positionToken.transfer(sender2.address, toWei(amount.toString()))
    // await positionToken.transfer(sender2.address, toWei(amount.toString()))
    await positionToken.excludeAccount(sender3.address)
    await positionToken.setPositionStakingManager(deployer.address)
    console.log("RATE log",await getRate(), await getBalanceOf(sender3.address))
    await positionToken.mint(sender2.address, toWei(amount.toString()))
    await positionToken.connect(sender2).transfer(sender3.address, toWei('1000'))
    console.log(await getBalanceOf(sender2.address))
    console.log(await getBalanceOf(sender3.address))
    console.log("RATE log", await getRate(), await getBalanceOf(sender3.address))
    await positionToken.mint(sender2.address, toWei(amount.toString()))
    await positionToken.connect(sender2).transfer(sender3.address, toWei('1000'))
    console.log("RATE log", await getRate(), await getBalanceOf(sender3.address))
    console.log(await getBalanceOf(sender3.address))
    console.log(await getBalanceOf(sender2.address))
    await positionToken.mint(sender2.address, toWei(amount.toString()))
    await positionToken.connect(sender2).transfer(sender3.address, toWei('1000'))
    console.log("RATE log", await getRate(), await getBalanceOf(sender3.address))
    console.log(await getBalanceOf(sender2.address))
    for(let i = 0; i<30; i ++){
      await positionToken.mint(sender2.address, toWei(amount.toString()))
      await positionToken.connect(sender2).transfer(sender3.address, toWei('1000'))
      console.log("RATE log", await getRate(), await getBalanceOf(sender3.address))
    }
    await positionToken.transfer(sender4.address, toWei('5000'));
   console.log(await getBalanceOf(sender2.address))
   console.log(await getBalanceOf(sender4.address))
    // await positionToken.includeAccount(sender3.address)



    // await positionToken.mint(sender3.address, toWei(amount.toString()))
    // await positionToken.includeAccount(sender3.address)
    expect(await getBalanceOf(sender3.address)).to.equal(amount.toString())
    // await positionToken.connect(sender3).transfer(sender4.address, toWei('100'))
    // console.log(await getBalanceOf(sender3.address))
    // console.log(await getBalanceOf(sender4.address))
    // await positionToken.excludeAccount(sender3.address)
    // await positionToken.mint(sender3.address, toWei('100'.toString()))
    // await positionToken.includeAccount(sender3.address)
    // console.log(await getBalanceOf(sender3.address))
    // await positionToken.excludeAccount(sender3.address);
    // await positionToken.mint(sender3.address, toWei(amount.toString()));
    // await positionToken.includeAccount(sender3.address);
    // console.log(await getBalanceOf(sender3.address))
  })
  

});
