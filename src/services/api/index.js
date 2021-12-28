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

  async isAuctionPeriod() {
    return false
  }

  async isBiddingOpen() {
    return false
  }

  async isRegistrationPeriod() {
    return true
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
      if (owner === this.account) domainStatus = this.DOMAIN_STATUSES.REGISTERED_SELF
      else domainStatus = this.DOMAIN_STATUSES.REGISTERED_OTHER
    } else if (isRegistrationPeriod) {
      domainStatus = this.DOMAIN_STATUSES.AVAILABLE
    } else if (isAuctionPeriod && isBiddingOpen) {
      domainStatus = this.DOMAIN_STATUSES.AUCTION_AVAILABLE
    } else if (isAuctionPeriod && !isBiddingOpen) {
      domainStatus = this.DOMAIN_STATUSES.AUCTION_BIDDING_CLOSED
    }

    return {
      constants: {
        DOMAIN_STATUSES: this.DOMAIN_STATUSES,
      },
      domain,
      owner,
      status: domainStatus,
      priceUSDCents: '1500',
      timestamp: parseInt(Date.now() / 1000),
    }
  }

  async getDomainPriceProof(domain) {
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
    const calldata = await services.circuits.calldata(proveRes)
    return calldata
  }
}

export default AvvyClient
