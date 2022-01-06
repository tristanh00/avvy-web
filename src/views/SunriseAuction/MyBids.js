import React from 'react'
import { connect } from 'react-redux'
import { ethers } from 'ethers'
import { TrashIcon } from '@heroicons/react/solid'

import components from 'components'
import services from 'services'

import actions from './actions'
import selectors from './selectors'

import AuctionPhase from './AuctionPhase'
import BidFlow from './BidFlow'
import RevealFlow from './RevealFlow'
import Summary from './Summary'



class MyBids extends React.PureComponent {
  componentDidMount() {
    this.props.loadAuctionPhases()
  }

  onCompleteBidFlow() {
    this.bidModal.toggle()
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.auctionPhases) {
      const claimStartsAt = this.props.auctionPhases[2] * 1000
      const claimEndsAt = this.props.auctionPhases[3] * 1000
      const now = parseInt(Date.now())
      if (now >= claimStartsAt && now < claimEndsAt) {
        this.props.loadWinningBids()
      }
    }
  }

  renderNoBids() {
    return (
      <>
        <div className='mt-4 mb-4 text-lg text-center font-bold'>{'My Bids'}</div>
        <div className='max-w-md m-auto'>
          <div className='mb-8'>
            <components.labels.Information text={"You haven't placed any bids"} />
          </div>
          <components.DomainSearch />
        </div>
      </>
    )
  }

  renderOver() {
    return (
      <div>Auction is over</div>
    )
  }

  renderClaim() {
    const claimEndsAt = this.props.auctionPhases[3] * 1000
    const later = Date.now() + 60 * 60 * 365 * 2000000
    const isSubmitted = (name) => this.props.unsubmittedBidNames.indexOf(name) === -1
    const isRevealed = (name) => this.props.revealedBidNames.indexOf(name) > -1
    const bids = this.props.bids
    const keys = Object.keys(bids).sort().filter(name => isSubmitted(name))
    const allRevealed = keys.reduce((sum, curr) => {
      if (!sum) return false
      if (!isRevealed(curr)) return false
      return true
    }, true)
    const nameData = this.props.nameData
    let bidTotal = ethers.BigNumber.from('0')
    let registrationTotal = ethers.BigNumber.from('0')
    let hasAllKeys = true
    keys.forEach(key => {
      bidTotal = bidTotal.add(ethers.BigNumber.from(bids[key]))
      if (!nameData[key]) {
        hasAllKeys = false
        return
      }
      registrationTotal = registrationTotal.add(ethers.BigNumber.from(nameData[key].priceUSDCents))
    })

    if (!hasAllKeys) return null

    if (keys.length === 0) return this.renderNoBids()

    return (
      <>
        <components.Modal ref={(ref) => {
          this.revealModal = ref
        }} onClose={() => {
          if (this.disableRevealModalWarning) return true
          const answer = window.confirm('Closing this window will abandon your bid reveal. Are you sure you want to proceed?')
          return answer
        }}> 
          <RevealFlow onComplete={() => {
            this.disableRevealModalWarning = true
            this.revealModal.toggle()
            this.disableRevealModalWarning = false
          }} />
        </components.Modal>
        <div className='mt-4 text-lg text-center font-bold'>{'My Bids - Claim'}</div>
        <div className='text-md text-left max-w-md m-auto text-gray-500 mb-4'>{'During this stage you must claim the auctions you have won.'}</div>
        <div className='mb-8'>
          {allRevealed ? (
            <components.labels.Success text={'All of your bids have been revealed.'} />
          ) : (
            <components.labels.Information text={'Some of your bids are not revealed.'} />
          )}
        </div>
        <components.Modal ref={(ref) => {
          this.bidModal = ref
        }} onClose={() => {
          if (this.disableBidModalWarning) return true
          const answer = window.confirm('Closing this window will cancel your bids. Are you sure you want to proceed?')
          return answer
        }}> 
          <BidFlow onComplete={() => {
            this.disableBidModalWarning = true
            this.bidModal.toggle()
            this.disableBidModalWarning = false
          }} />
        </components.Modal>
        {keys.map((key, index) => {
          const result = this.props.auctionResults[key]
          return (
            <div className='bg-gray-100 rounded-lg p-4 mb-4' key={index}>
              <div className='font-bold'>{key}</div>
              <div className=''>Your Bid: {services.money.renderAVAX(bids[key])}</div>
              <div className=''>Yearly registration fee: {services.money.renderUSD(nameData[key].priceUSDCents)}</div>
              <div className='flex mt-2'>
                <div className='mr-2'>
                  {result === 'NO_WINNER' ? (
                    <components.labels.Error text={'No participants have enough WAVAX to claim'} size={'xs'} />
                  ) : (
                    <components.labels.Error text={'Bid not revealed'} size={'xs'} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div className='max-w-md m-auto mt-8'>
          <Summary.FullSummary bidTotal={bidTotal} registrationTotal={registrationTotal} showAvailable={true} />
          <div className='my-8'>
            <components.labels.Information text={'Please ensure that you have enough to cover bids & registration fees if you win every auction. All amounts will be payable in WAVAX. Final amounts will be calculated based on USD-AVAX exchange rate when auctions are settled.'} />
          </div>
          {allRevealed ? 
            <div>
              <div className='font-bold text-center mb-4 text-lg'>{"Next auction phase:"}</div>
              <AuctionPhase name='Auction over' startsAt={claimEndsAt} endsAt={later} />
            </div>
          : (
            <components.buttons.Button text={'Reveal Bids'} onClick={() => this.revealModal.toggle()} />
          )}
        </div>
      </>
    )
  }


  renderBidReveal() {
    const claimStartsAt = this.props.auctionPhases[2] * 1000
    const claimEndsAt = this.props.auctionPhases[3] * 1000
    const isSubmitted = (name) => this.props.unsubmittedBidNames.indexOf(name) === -1
    const isRevealed = (name) => this.props.revealedBidNames.indexOf(name) > -1
    const bids = this.props.bids
    const keys = Object.keys(bids).sort().filter(name => isSubmitted(name))
    const allRevealed = keys.reduce((sum, curr) => {
      if (!sum) return false
      if (!isRevealed(curr)) return false
      return true
    }, true)
    const nameData = this.props.nameData
    let bidTotal = ethers.BigNumber.from('0')
    let registrationTotal = ethers.BigNumber.from('0')
    let hasAllKeys = true
    keys.forEach(key => {
      bidTotal = bidTotal.add(ethers.BigNumber.from(bids[key]))
      if (!nameData[key]) {
        hasAllKeys = false
        return
      }
      registrationTotal = registrationTotal.add(ethers.BigNumber.from(nameData[key].priceUSDCents))
    })

    if (!hasAllKeys) return null

    if (keys.length === 0) return this.renderNoBids()

    return (
      <>
        <components.Modal ref={(ref) => {
          this.revealModal = ref
        }} onClose={() => {
          if (this.disableRevealModalWarning) return true
          const answer = window.confirm('Closing this window will abandon your bid reveal. Are you sure you want to proceed?')
          return answer
        }}> 
          <RevealFlow onComplete={() => {
            this.disableRevealModalWarning = true
            this.revealModal.toggle()
            this.disableRevealModalWarning = false
          }} bidTotal={bidTotal} registrationTotal={registrationTotal} />
        </components.Modal>
        <div className='md:flex md:mt-2 md:mx-4'>
          <div className='w-full md:mr-8'>
            <div>
              <div className='mt-4 text-lg text-center font-bold md:text-left md:mt-0 md:text-xl'>{'My Bids - Bid Reveal'}</div>
              <div className='text-md text-left text-gray-500 mb-4 max-w-sm m-auto md:text-left md:m-0'>{'During this stage you must reveal your submitted bids & authorize payment in WAVAX.'}</div>
              <div className='mb-8 mt-4'></div>
            </div>
            <div className='mb-8'>
              {allRevealed ? (
                <components.labels.Success text={'All of your bids have been revealed.'} justify='justify-flex-start' />
              ) : (
                <components.labels.Information text={'Some of your bids are not revealed.'} justify='justify-flex-start' />
              )}
            </div>
            {keys.map((key, index) => {
              const _isRevealed = isRevealed(key)
              return (
                <div className='bg-gray-100 rounded-lg p-4 mb-4' key={index}>
                  <div className='font-bold'>{key}</div>
                  <div className=''>Your Bid: {services.money.renderAVAX(bids[key])}</div>
                  <div className=''>Yearly registration fee: {services.money.renderUSD(nameData[key].priceUSDCents)}</div>
                  <div className='flex mt-2'>
                    <div className='mr-2'>
                      {_isRevealed ? (
                        <components.labels.Success text={'Bid revealed'} />
                      ) : (
                        <components.labels.Error text={'Bid not revealed'} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className='max-w-md m-auto mt-8 md:w-full md:max-w-sm md:bg-gray-100 md:rounded-lg md:p-4 md:mt-0 md:flex-shrink-0'>
            <Summary.FullSummary bidTotal={bidTotal} registrationTotal={registrationTotal} showAvailable={allRevealed} />
            {allRevealed ? 
              <div>
                <div className='font-bold text-center mb-4 text-lg'>{"Next auction phase:"}</div>
                <AuctionPhase name='Claim' startsAt={claimStartsAt} endsAt={claimEndsAt} />
              </div>
            : (
              <components.buttons.Button text={'Reveal Bids'} onClick={() => this.revealModal.toggle()} />
            )}
          </div>
        </div>
      </>
    )
  }

  renderBidPlacement() {
    const bidRevealStartsAt = this.props.auctionPhases[1] * 1000
    const claimStartsAt = this.props.auctionPhases[2] * 1000
    const isSubmitted = (name) => this.props.unsubmittedBidNames.indexOf(name) === -1
    const bids = this.props.bids
    const keys = Object.keys(bids).sort()
    const allSubmitted = keys.reduce((sum, curr) => {
      if (!sum) return false
      if (!isSubmitted(curr)) return false
      return true
    }, true)
    const nameData = this.props.nameData
    let bidTotal = ethers.BigNumber.from('0')
    let registrationTotal = ethers.BigNumber.from('0')
    let hasAllKeys = true
    keys.forEach(key => {
      bidTotal = bidTotal.add(ethers.BigNumber.from(bids[key]))
      if (!nameData[key]) {
        hasAllKeys = false
        return
      }
      registrationTotal = registrationTotal.add(ethers.BigNumber.from(nameData[key].priceUSDCents))
    })

    if (!hasAllKeys) return null

    if (keys.length === 0) return this.renderNoBids()

    return (
      <div className='md:flex md:px-4 md:mt-2'>
        <div className='w-full md:mr-8'>
          <div className='mt-4 text-lg text-center font-bold md:text-left md:text-lg md:mt-0'>{'My Bids - Bid Placement'}</div>
          <div className='text-md text-left text-gray-500 mb-4 max-w-sm m-auto md:text-left md:m-0'>{'During this stage, you must place your sealed bids. No one will know the domain or price of your bid.'}</div>
          <div className='mb-8 mt-4'>
            {allSubmitted ? (
              <components.labels.Success text={'All of your bids have been submitted.'} justify='justify-flex-start' />
            ) : (
              <components.labels.Information text={'Some of your bids are not submitted.'} justify='justify-flex-start' />
            )}
          </div>
          <components.Modal ref={(ref) => {
            this.bidModal = ref
          }} onClose={() => {
            if (this.disableBidModalWarning) return true
            const answer = window.confirm('Closing this window will abandon your bid placement. Are you sure you want to proceed?')
            return answer
          }}> 
            <BidFlow onComplete={() => {
              this.disableBidModalWarning = true
              this.bidModal.toggle()
              this.disableBidModalWarning = false
            }} />
          </components.Modal>
          {keys.map((key, index) => {
            const _isSubmitted = isSubmitted(key)
            return (
              <div className='bg-gray-100 rounded-lg p-4 mb-4' key={index}>
                <div className='font-bold'>{key}</div>
                <div className=''>Your Bid: {services.money.renderWAVAX(bids[key])}</div>
                <div className=''>Yearly registration fee: {services.money.renderUSD(nameData[key].priceUSDCents)}</div>
                <div className='flex mt-2'>
                  <div className='mr-2'>
                    {_isSubmitted ? (
                      <components.labels.Success text={'Bid submitted'} size={'xs'} />
                    ) : (
                      <components.labels.Error text={'Bid not submitted'} size={'xs'} />
                    )}
                  </div>
                  {_isSubmitted ? null : (
                    <div className='flex items-end cursor-pointer' onClick={() => this.props.deleteBid(key)}>
                      <TrashIcon className='w-4' />
                      <div className='font-bold text-xs ml-1'>{"Delete"}</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className='max-w-sm w-full m-auto mt-8 md:flex-shrink-0 md:ml-4 md:pl-4 md:mt-0 md:bg-gray-100 md:rounded-lg md:p-4'>
          <Summary.FullSummary bidTotal={bidTotal} registrationTotal={registrationTotal} />
          {allSubmitted ? (
            <div>
              <div className='font-bold text-center mb-4 text-lg'>{"Next auction phase:"}</div>
              <AuctionPhase name='Bid reveal' startsAt={bidRevealStartsAt} endsAt={claimStartsAt} />
            </div>
          ) : (
            <components.buttons.Button text={'Place Bids'} onClick={() => this.bidModal.toggle()} />
          )}
        </div>
      </div>
    )
  }

  render() {
    if (!this.props.auctionPhases) return null
    const bidPlacementStartsAt = this.props.auctionPhases[0] * 1000
    const bidRevealStartsAt = this.props.auctionPhases[1] * 1000
    const claimStartsAt = this.props.auctionPhases[2] * 1000
    const claimEndsAt = this.props.auctionPhases[3] * 1000
    const end = new Date((claimEndsAt + 60 * 60 * 24 * 365 * 100) * 1000)
    const now = parseInt(Date.now())
    if (now >= bidPlacementStartsAt && now < bidRevealStartsAt) return this.renderBidPlacement()
    if (now >= bidRevealStartsAt && now < claimStartsAt) return this.renderBidReveal()
    if (now >= claimStartsAt && now < claimEndsAt) return this.renderClaim()
    return this.renderOver()
  }
}

const mapStateToProps = (state) => ({
  bids: services.sunrise.selectors.bids(state),
  nameData: services.sunrise.selectors.nameData(state),
  auctionPhases: selectors.auctionPhases(state),
  unsubmittedBidNames: services.sunrise.selectors.unsubmittedBidNames(state),
  revealedBidNames: services.sunrise.selectors.revealedBidNames(state),
  auctionResults: selectors.auctionResults(state),
})

const mapDispatchToProps = (dispatch) => ({
  loadAuctionPhases: () => dispatch(actions.loadAuctionPhases()),
  deleteBid: (key) => dispatch(services.sunrise.actions.deleteBid(key)),
  loadWinningBids: () => dispatch(actions.loadWinningBids()),
})

export default connect(mapStateToProps, mapDispatchToProps)(MyBids)
