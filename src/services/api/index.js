//
// This service is responsible for
// interacting with the chain.
// Portions of this service will be 
// extracted later for the public
// API clients.
//
import artifacts from '@avvy/artifacts'
import { ethers } from 'ethers'
import client from '@avvy/client'

import services from 'services'

class AvvyClient {
  constructor(chainId, account, signer) {
    const contracts = artifacts.contracts[chainId]
    this.contracts = {}
    for (let key in contracts) {
      this.contracts[key] = new ethers.Contract(
        contracts[key].address,
        contracts[key].abi,
        signer
      )
    }

    this.account = account
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

  async isAuctionPeriod() {
    return false
  }

  async isBiddingOpen() {
    return false
  }

  async isRegistrationPeriod() {
    return true
  }

  // ESTIMATE
  async getNamePrice(domain) {
    const name = domain.split('.')[0]
    let priceUSDCents = '1500'
    if (name.length === 3) {
      priceUSDCents = '50000'
    } else if (name.length === 4) {
      priceUSDCents = '15000'
    } else if (name.length === 5) {
      priceUSDCents = '5000'
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

  isSupported(name) {
    // checks whether a given name is supported by the system
    const split = name.split('.')
    if (split.length !== 2) return false
    if (split[1] !== 'avax') return false
    if (split[0].length < 3) return false
    if (split[0].length > 62) return false
    return true
  }

  async getAVAXConversionRate() {
    // this is just fixed price for now based on latestRound from oracle
    const rate = ethers.BigNumber.from('10000000000')
    return ethers.BigNumber.from('10').pow('24').div(rate)
  }

  async loadDomain(domain) {
    
    // hash the name
    const hash = await client.nameHash(domain)
    const tokenExists = await this.tokenExists(hash)
    const isAuctionPeriod = await this.isAuctionPeriod()
    const isBiddingOpen = await this.isBiddingOpen()
    const isRegistrationPeriod = await this.isRegistrationPeriod()
    let domainStatus
    let owner = null

    if (tokenExists) {
      owner = await this.ownerOf(hash)
      if (owner && this.account && owner.toLowerCase() == this.account.toLowerCase()) domainStatus = this.DOMAIN_STATUSES.REGISTERED_SELF
      else domainStatus = this.DOMAIN_STATUSES.REGISTERED_OTHER
    } else if (isRegistrationPeriod) {
      domainStatus = this.DOMAIN_STATUSES.AVAILABLE
    } else if (isAuctionPeriod && isBiddingOpen) {
      domainStatus = this.DOMAIN_STATUSES.AUCTION_AVAILABLE
    } else if (isAuctionPeriod && !isBiddingOpen) {
      domainStatus = this.DOMAIN_STATUSES.AUCTION_BIDDING_CLOSED
    }

    let priceUSDCents = await this.getNamePrice(domain)
    let avaxConversionRate = await this.getAVAXConversionRate()
    let priceAVAXEstimate = avaxConversionRate.mul(ethers.BigNumber.from(priceUSDCents)).toString()
    let expiresAt = await this.getNameExpiry(hash)

    return {
      constants: {
        DOMAIN_STATUSES: this.DOMAIN_STATUSES,
      },
      supported: this.isSupported(domain),
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
    const nameArr = await client.string2AsciiArray(name, 62)
    const namespace = domainSplit[domainSplit.length - 1]
    const namespaceHash = await client.nameHash(namespace)
    const hash = await client.nameHash(domain)
    let minLength = name.length
    if (name.length >= 6) minLength = 6
    const c = client
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
    const namespace = await client.string2AsciiArray(_namespace, 62)
    const name = await client.string2AsciiArray(_name, 62)
    const hash = await client.nameHash(domain)
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
      let hash = await client.nameHash(domains[i])
      hashes.push(hash.toString())
    }
    const hash = await client.registrationCommitHash(hashes, quantities, constraintsProofs, pricingProofs, salt)
    await this.contracts.LeasingAgentV1.commit(hash)
    return hash
  }

  async register(domains, quantities, constraintsProofs, pricingProofs, salt) {
    let hashes = []
    let total = ethers.BigNumber.from('0')
    const conversionRate = await this.getAVAXConversionRate()

    for (let i = 0; i < domains.length; i += 1) {
      let hash = await client.nameHash(domains[i])
      hashes.push(hash.toString())
      let namePrice = await this.getNamePriceAVAX(domains[i], conversionRate)
      total = total.add(
        ethers.BigNumber.from(quantities[i].toString()).mul(
          namePrice
        )
      )
    }

    const tx = await this.contracts.PricingOracleV1.getPriceForName(hashes[0], pricingProofs[0])
    const receipt = await tx.wait()
    const price = receipt.events[0].args[0]

    await this.contracts.LeasingAgentV1.register(hashes, quantities, constraintsProofs, pricingProofs, salt, {
      value: total
    })
  }
}

export default AvvyClient
