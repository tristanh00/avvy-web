//
// This service is responsible for
// interacting with the chain.
// Portions of this service will be 
// extracted later for the public
// API clients.
//
import { ethers } from 'ethers'
import client from '@avvy/client'

import services from 'services'

class AvvyClient {
  constructor(chainId, account, signerOrProvider) {
    this.chainId = parseInt(chainId)
    this.avvy = new client(signerOrProvider, {
      chainId
    })
    this.contracts = this.avvy.contracts

    this.account = account
    this.signer = signerOrProvider
    this.DOMAIN_STATUSES = [
      'AVAILABLE',
      'AUCTION_AVAILABLE',
      'AUCTION_BIDDING_CLOSED',
      'REGISTERED_OTHER',
      'REGISTERED_SELF',
    ].reduce((sum, curr) => {
      sum[curr] = curr
      return sum
    }, {})
    this.client = client
  }

  async tokenExists(hash) {
    const exists = await this.contracts.Domain.exists(hash)
    return exists
  }
  
  async ownerOf(hash) {
    const owner = await this.contracts.Domain.ownerOf(hash)
    return owner
  }

  async getDomainCountForOwner(account) {
    const count = await this.contracts.Domain.balanceOf(account)
    return parseInt(count.toString())
  }

  async getDomainIDsByOwner(account) {
    const domainCount = await this.getDomainCountForOwner(account)
    let domains = []
    for (let i = 0; i < domainCount; i += 1) {
      let id = await this.contracts.Domain.tokenOfOwnerByIndex(account, i.toString())
      domains.push(id)
    }
    return domains
  }

  async getTokenOfOwnerByIndex(account, index) {
    let id = await this.contracts.Domain.tokenOfOwnerByIndex(account, index.toString())
    return id
  }

  async isAuctionPeriod(auctionPhases) {
    const biddingStartsAt = parseInt(auctionPhases[0]) * 1000
    const claimEndsAt = parseInt(auctionPhases[3]) * 1000
    const now = parseInt(Date.now())
    return now >= biddingStartsAt && now < claimEndsAt
  }

  async isBiddingOpen(auctionPhases) {
    const biddingStartsAt = parseInt(auctionPhases[0]) * 1000
    const revealStartsAt = parseInt(auctionPhases[1]) * 1000
    const now = parseInt(Date.now())
    return now >= biddingStartsAt && now < revealStartsAt 
  }

  async isRegistrationPeriod() {
    return true
  }

  // ESTIMATE
  async getNamePrice(domain) {
    const name = domain.split('.')[0]
    let priceUSDCents = '500'
    if (name.length === 3) {
      priceUSDCents = '64000'
    } else if (name.length === 4) {
      priceUSDCents = '16000'
    }
    return priceUSDCents
  }

  async getNameExpiry(hash) {
    const expiresAt = await this.contracts.Domain.getDomainExpiry(hash)
    return parseInt(expiresAt.toString())
  }

  async getNamePriceAVAX(domain, conversionRate) {
    const _priceUSD = await this.getNamePrice(domain)
    const priceUSD = ethers.BigNumber.from(_priceUSD)
    const priceAVAX = priceUSD.mul(conversionRate)
    return priceAVAX
  }

  async nameHash(name) {
    const hash = await client.utils.nameHash(name)
    return hash
  }

  async isSupported(name) {
    // checks whether a given name is supported by the system
    if (!name) return false
    const hash = await client.utils.nameHash(name)
    if (client.blocklist.isBlocked(hash)) return false
    const split = name.split('.')
    if (split.length !== 2) return false
    if (split[1] !== 'avax') return false
    if (split[0].length < 3) return false
    if (split[0].length > 62) return false
    if (!split[0].match(/^[a-z0-9][a-z0-9-]+[a-z0-9]$/)) return false
    if (split[0].length >= 4 && split[0][2] === '-' && split[0][3] === '-') return false
    return true
  }

  async getAVAXConversionRateFromChainlink(address) {
    let oracle = new ethers.Contract(address, services.abi.chainlink, this.signer)
    let roundData = await oracle.latestRoundData()
    let rate = roundData[1].toString()

    // add a buffer to the rate, so that we can have less chance of getting a revert due to not enough AVAX
    rate = ethers.BigNumber.from(rate).div('10').mul('9').toString()

    return rate
  }

  async getAVAXConversionRate() {
    // this is just fixed price for now based on latestRound from oracle
    let rate
    if (this.chainId === 31337) {
      rate = ethers.BigNumber.from('10000000000')
    } else if (this.chainId === 43113) {
      rate = await this.getAVAXConversionRateFromChainlink('0x5498BB86BC934c8D34FDA08E81D444153d0D06aD')
    } else if (this.chainId === 43114) {
      rate = await this.getAVAXConversionRateFromChainlink('0x0A77230d17318075983913bC2145DB16C7366156')
    }
    return ethers.BigNumber.from('10').pow('24').div(rate)
  }

  async revealDomain(domain) {
    const preimage = await client.utils.encodeNameHashInputSignals(domain)
    const hash = await client.utils.nameHash(domain)
    const tx = await this.contracts.RainbowTableV1.reveal(preimage, hash)
    await tx.wait()
  }

  async loadDomain(domain) {
    
    // hash the name
    const hash = await client.utils.nameHash(domain)
    const tokenExists = await this.tokenExists(hash)
    let domainStatus
    let owner = null

    if (tokenExists) {
      owner = await this.ownerOf(hash)
      if (owner && this.account && owner.toLowerCase() === this.account.toLowerCase()) domainStatus = this.DOMAIN_STATUSES.REGISTERED_SELF
      else domainStatus = this.DOMAIN_STATUSES.REGISTERED_OTHER
    } else {
      domainStatus = this.DOMAIN_STATUSES.AVAILABLE
    }

    let priceUSDCents = await this.getNamePrice(domain)
    let avaxConversionRate = await this.getAVAXConversionRate()
    let priceAVAXEstimate = avaxConversionRate.mul(ethers.BigNumber.from(priceUSDCents)).toString()
    let expiresAt = await this.getNameExpiry(hash)


    return {
      constants: {
        DOMAIN_STATUSES: this.DOMAIN_STATUSES,
      },
      supported: await this.isSupported(domain, hash),
      domain,
      hash: hash.toString(),
      owner,
      expiresAt,
      status: domainStatus,
      priceUSDCents,
      priceAVAXEstimate,
      timestamp: parseInt(Date.now() / 1000),
    }
  }

  async generateDomainPriceProof(domain) {
    const domainSplit = domain.split('.')
    const name = domainSplit[0]
    const nameArr = await client.utils.string2AsciiArray(name, 62)
    const namespace = domainSplit[domainSplit.length - 1]
    const namespaceHash = await client.utils.nameHash(namespace)
    const hash = await client.utils.nameHash(domain)
    let minLength = name.length
    if (name.length >= 6) minLength = 6
    const inputs = {
      namespaceId: namespaceHash.toString(),
      name: nameArr,
      hash: hash.toString(),
      minLength
    }
    const proveRes = await services.circuits.prove('PriceCheck', inputs)
    const verify = await services.circuits.verify('PriceCheck', proveRes)
    if (!verify) throw new Error('Failed to verify')
    const calldata = await services.circuits.calldata(proveRes)
    return {
      proveRes,
      calldata
    }
  }

  async generateConstraintsProof(domain) {
    const split = domain.split('.')
    const _name = split[0]
    const _namespace = split[1]
    const namespace = await client.utils.string2AsciiArray(_namespace, 62)
    const name = await client.utils.string2AsciiArray(_name, 62)
    const hash = await client.utils.nameHash(domain)
    const inputs = {
      namespace,
      name,
      hash: hash.toString(),
    }
    const proveRes = await services.circuits.prove('Constraints', inputs)
    const verify = await services.circuits.verify('Constraints', proveRes)
    if (!verify) throw new Error('Failed to verify')
    const calldata = await services.circuits.calldata(proveRes)
    return {
      proveRes,
      calldata
    }
  }

  async commit(domains, quantities, constraintsProofs, pricingProofs, salt) {
    let hashes = []
    for (let i = 0; i < domains.length; i += 1) {
      let hash = await client.utils.nameHash(domains[i])
      hashes.push(hash.toString())
    }
    const hash = await client.utils.registrationCommitHash(hashes, quantities, constraintsProofs, pricingProofs, salt)
    const tx = await this.contracts.LeasingAgentV1.commit(hash)
    await tx.wait()
    return hash
  }

  async _getRegistrationArgs(domains, quantities) {
    let hashes = []
    let total = ethers.BigNumber.from('0')
    const conversionRate = await this.getAVAXConversionRate()

    for (let i = 0; i < domains.length; i += 1) {
      let hash = await client.utils.nameHash(domains[i])
      hashes.push(hash.toString())
      let namePrice = await this.getNamePriceAVAX(domains[i], conversionRate)
      total = total.add(
        ethers.BigNumber.from(quantities[i].toString()).mul(
          namePrice
        )
      )
    }
    return {
      total, 
      hashes
    }
  }

  _getTreasuryGasSurplus() {
    return ethers.BigNumber.from('20000')
  }

  async register(domains, quantities, constraintsProofs, pricingProofs) {
    const { total, hashes } = await this._getRegistrationArgs(domains, quantities)
    const premium = await this.getRegistrationPremium()
    const value = total.add(premium.mul(hashes.length))
    const gasEstimate = await this.contracts.LeasingAgentV1.estimateGas.register(hashes, quantities, constraintsProofs, pricingProofs, {
      value
    })
    const gasLimit = gasEstimate.add(this._getTreasuryGasSurplus().mul(hashes.length))
    const registerTx = await this.contracts.LeasingAgentV1.register(hashes, quantities, constraintsProofs, pricingProofs, {
      gasLimit,
      value
    })
    await registerTx.wait()
  }

  async registerWithPreimage(domains, quantities, constraintsProofs, pricingProofs, preimages) {
    const { total, hashes } = await this._getRegistrationArgs(domains, quantities)
    const premium = await this.getRegistrationPremium()
    const value = total.add(premium.mul(hashes.length))
    const gasEstimate = await this.contracts.LeasingAgentV1.estimateGas.registerWithPreimage(hashes, quantities, constraintsProofs, pricingProofs, preimages, {
      value,
    })

    const gasLimit = gasEstimate.add(this._getTreasuryGasSurplus().mul(hashes.length))
    const registerTx = await this.contracts.LeasingAgentV1.registerWithPreimage(hashes, quantities, constraintsProofs, pricingProofs, preimages, {
      gasLimit,
      value
    })
    await registerTx.wait()
  }

  async getAuctionPhases() {
    const now = parseInt(Date.now() / 1000)
    if (this._auctionPhasesCache && now - this._auctionPhasesCachedAt < 60 * 5) return this._auctionPhasesCache
    const params = await this.contracts.SunriseAuctionV1.getAuctionParams()
    const phases = params.map(p => parseInt(p.toString()))
    this._auctionPhasesCache = phases
    this._auctionPhasesCachedAt = now
    return phases
  }

  async bid(hashes) {
    const tx = await this.contracts.SunriseAuctionV1.bid(hashes)
    await tx.wait()
  }

  async reveal(names, amounts, salt) {
    const tx = await this.contracts.SunriseAuctionV1.reveal(names, amounts, salt)
    await tx.wait()
  }

  async revealWithPreimage(names, amounts, salt, preimages) {
    const tx = await this.contracts.SunriseAuctionV1.revealWithPreimage(names, amounts, salt, preimages)
    await tx.wait()
  }

  async getWinningBid(name) {
    const hash = await client.utils.nameHash(name)
    let result
    try {
      const output = await this.contracts.SunriseAuctionV1.getWinningBid(hash.toString())
      try {
        const owner = await this.ownerOf(hash.toString())
        result = {
          type: 'IS_CLAIMED',
          owner,
          winner: output.winner,
          auctionPrice: output.auctionPrice.toString(),
          isWinner: output.winner.toLowerCase() === this.account
        }
      } catch (err) {
        result = {
          type: 'HAS_WINNER',
          winner: output.winner,
          auctionPrice: output.auctionPrice.toString(),
          isWinner: output.winner.toLowerCase() === this.account
        }
      }
    } catch (err) {
      result = {
        type: 'NO_WINNER'
      }
      console.log(err)
    }
    return result
  }

  getWavaxContract() {
    let contract
    if (this.chainId === 31337) {
      contract = this.contracts.MockWavax
    } else if (this.chainId === 43113) {
      contract = new ethers.Contract('0xd00ae08403B9bbb9124bB305C09058E32C39A48c', services.abi.wavax, this.signer)
    } else if (this.chainId === 43114) {
      contract = new ethers.Contract('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', services.abi.wavax, this.signer)
    }
    return contract
  }

  async getWavaxBalance() {
    const contract = this.getWavaxContract()
    const balance = await contract.balanceOf(this.account)
    return balance.toString()
  }

  async getAuctionWavax() {
    const contract = this.getWavaxContract()
    const allowance = await contract.allowance(this.account, this.contracts.SunriseAuctionV1.address)
    return allowance.toString()
  }

  async wrapAvax(amount) {
    const contract = this.getWavaxContract()
    const tx = await contract.deposit({
      value: amount
    })
    await tx.wait()
  }

  async approveWavaxForAuction(amount) {
    const contract = this.getWavaxContract()
    const tx = await contract.approve(this.contracts.SunriseAuctionV1.address, amount) 
    await tx.wait()
  }

  async getRevealedBidForSenderCount() {
    const count = await this.contracts.SunriseAuctionV1.getRevealedBidForSenderCount()
    return count
  }

  async getRevealedBidForSenderAtIndex(index) {
    const bid = await this.contracts.SunriseAuctionV1.getRevealedBidForSenderAtIndex(index)
    let nameSignal, preimage
    try {
      nameSignal = await this.contracts.RainbowTableV1.lookup(bid.name)
      preimage = await client.utils.decodeNameHashInputSignals(nameSignal)
    } catch (err) {
      preimage = null
    }
    return {
      name: bid.name,
      amount: bid.amount,
      timestamp: bid.timestamp,
      preimage: preimage
    }
  }

  async sunriseClaim(names, constraintsData) {
    const hashes = []
    for (let i = 0; i < names.length; i += 1) {
      let hash = await client.utils.nameHash(names[i])
      hashes.push(hash.toString())
    }
    const tx = await this.contracts.SunriseAuctionV1.claim(hashes, constraintsData)
    await tx.wait()
  }

  async checkHasAccount() {
    // check if there is an account on-chain
    const hasAccount = await this.contracts.AccountGuardV1.addressHasAccount(this.account)
    return hasAccount
  }

  async submitAccountVerification(signature) {
    const tx = await this.contracts.AccountGuardV1.verify(ethers.utils.getAddress(this.account), signature)
    await tx.wait()
  }

  async getRegistrationPremium() {
    const now = parseInt(Date.now() / 1000)
    const registrationPremium = await this.contracts.LeasingAgentV1.getRegistrationPremium(now)
    return registrationPremium
  }

  async buildPreimages(names) {
    let signal = []
    for (let i = 0; i < names.length; i += 1) {
      let _sig = await client.utils.encodeNameHashInputSignals(names[i])
      signal = signal.concat(_sig)
    }
    return signal
  }

  async lookupPreimage(hash) {
    const output = await this.contracts.RainbowTableV1.lookup(hash)
    const name = await client.utils.decodeNameHashInputSignals(output)
    return name
  }

  async isPreimageRevealed(hash) {
    const output = await this.contracts.RainbowTableV1.isRevealed(hash)
    return output
  }

  getDefaultResolverAddress() {
    return this.contracts.PublicResolverV1.address
  }

  async getResolver(domain) {
    const hash = await client.utils.nameHash(domain)
    const resolver = await this.contracts.ResolverRegistryV1.get(hash, hash)
    return resolver
  }

  async setResolver(domain, address) {
    const hash = await client.utils.nameHash(domain)
    const defaultResolverAddress = this.getDefaultResolverAddress()
    let datasetId
    if (address === defaultResolverAddress) {
      datasetId = hash
    } else {
      // otherwise, we are setting it to None
      datasetId = 0
    }
    const contract = await this.contracts.ResolverRegistryV1
    const tx = await contract.set(hash, [], address, datasetId)
    await tx.wait()
  }

  async setStandardRecord(domain, type, value) {
    const hash = await client.utils.nameHash(domain)
    const tx = await this.contracts.PublicResolverV1.setStandard(hash, [], type, value)
    await tx.wait()
  }

  async getStandardRecords(domain) {
    // this won't work for subdomains yet.
    const hash = await client.utils.nameHash(domain)
    const promises = this.avvy.RECORDS._LIST.map(r => this.contracts.PublicResolverV1.resolveStandard(hash, hash, r.key))
    const results = await Promise.all(promises)
    return results.map((res, index) => {
      return {
        type: index + 1,
        value: res
      }
    }).filter(res => res.value !== '')
  }

  async getReverseRecords(domain) {
    const hash = await client.utils.nameHash(domain)
    const promises = [
      this.avvy.contracts.EVMReverseResolverV1.getEntry(hash, hash)
    ]
    const results = await Promise.all(promises)
    return {
      [this.avvy.RECORDS.EVM]: results[0] === '0x0000000000000000000000000000000000000000' ? null : results[0]
    }
  }

  async setEVMReverseRecord(domain) {
    const hash = await client.utils.nameHash(domain)
    const tx = await this.avvy.contracts.EVMReverseResolverV1.set(hash, [])
    await tx.wait()
  }

  async getBalance() {
    const balance = await this.signer.getBalance()
    return balance
  }

  async transferDomain(domain, address) {
    const tokenId = await client.utils.nameHash(domain)
    const tx = await this.contracts.Domain['safeTransferFrom(address,address,uint256)'](this.account, address, tokenId)
    await tx.wait()
  }
}

export default AvvyClient
