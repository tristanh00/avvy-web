import React from 'react'
import { connect } from 'react-redux' 
import components from 'components'
import services from 'services'

import actions from './actions'
import selectors from './selectors'

import Summary from './Summary'


class RevealFlow extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      connected: services.provider.isConnected(),
      wavax: false,
      claimConfirm: false,
      dataBackupConfirm: false,
      checkedDisclaimers: false,
      hasBackedUp: false,
    }
  }

  backup = () => {
    services.data.backup()
    this.setState({
      hasBackedUp: true
    })
  }

  checkClaimConfirm = () => {
    this.setState((currState) => {
      return {
        claimConfirm: !currState.claimConfirm
      }
    })
  }

  checkDataBackupConfirm = () => {
    this.setState((currState) => {
      return {
        dataBackupConfirm: !currState.dataBackupConfirm
      }
    })
  }

  checkDisclaimers = () => {
    this.setState((currState) => {
      return {
        checkedDisclaimers: true
      }
    }, () => {
      console.log(this.state)
    })
  }

  onConnect() {
    setTimeout(() => {
      this.setState({
        connected: services.provider.isConnected(),
      })
    }, 1)
  }

  componentDidMount() {
    services.provider.addEventListener(services.provider.EVENTS.CONNECTED, this.onConnect.bind(this))
  }

  componentWillUnmount() {
    services.provider.removeEventListener(services.provider.EVENTS.CONNECTED, this.onConnect.bind(this))
  }

  renderConnect() {
    return (
      <>
        <div className='font-bold border-b border-gray-400 pb-4 mb-4'>{'Connect Wallet'}</div>
        <components.ConnectWallet />
      </>
    )
  }

  revealBundle(bundleKey) {
    this.props.revealBundle(bundleKey)
  }

  renderWavax() {
    return (
      <>
        <div className='font-bold border-b border-gray-400 pb-4 mb-4'>{'Approve WAVAX'}</div>
        <div className='text-gray-500'>{'During the claim period, any bids that are not covered by WAVAX are considered invalid. To have valid bids, you must (1) have enough WAVAX in your wallet to cover the bids and (2) approve spending for the Sunrise Auction contract'}</div>
        <div className='max-w-sm m-auto my-4'>
          <Summary.WavaxSummary bidTotal={this.props.bidTotal} onSuccess={() => this.setState({ wavax: true })} />
        </div>
      </>
    )
  }

  renderReveal() {
    const bundleKeys = Object.keys(this.props.bundles)
    if (!this.state.checkedDisclaimers) return (
      <>
        <div className='font-bold border-b border-gray-400 pb-4 mb-4'>{'Reveal Bids'}</div>
        <div className='max-w-md m-auto'>
          <div className='mb-4'>
              <components.Checkbox onCheck={this.checkClaimConfirm} checked={this.state.claimConfirm} text={'I understand that I must return during the Domain Claiming phase to claim any auctions I have won.'} />
          </div>
          <div className='mb-4'>
            <components.Checkbox onCheck={this.checkDataBackupConfirm} checked={this.state.dataBackupConfirm} text={'I understand that my revealed bid details are stored in my web browser and if that data is lost, I may not be able to claim my domains. I will back up my data.'} />
          </div>
          <div className='mb-4'>
            <components.buttons.Button text={'Continue'} disabled={!this.state.claimConfirm || !this.state.dataBackupConfirm} onClick={this.checkDisclaimers} />
          </div>
        </div>
      </>
    )
    return (
      <>
        <div className='font-bold border-b border-gray-400 pb-4 mb-4'>{'Reveal Bids'}</div>
        {bundleKeys.length > 1 ? (
          <components.labels.Information text={"You submitted your bids in multiple transactions, so they must be revealed in multiple transactions."} />
        ) : (
          <components.labels.Information text={"Reveal your bids to continue."} />
        )}
        <div className='mt-8 max-w-sm m-auto'>
          {bundleKeys.length === 1 ? (
            <components.buttons.Button text={'Reveal Bids'} onClick={() => this.revealBundle(bundleKeys[0])} loading={this.props.revealingBundle[bundleKeys[0]]} />
          ) : bundleKeys.map((bundle, index) => (
            <div key={index} className='mb-4'>
              <components.buttons.Button text={`Reveal Bid Transaction #${index + 1}`} onClick={() => this.revealBundle(bundle)} loading={this.props.revealingBundle[bundle]} disabled={this.props.revealedBundles[bundle]} />
            </div>
          ))}
        </div>
      </>
    )
  }

  renderComplete() {
    return (
      <>
        <div className='font-bold border-b border-gray-400 pb-4 mb-4'>{'Bid reveal complete'}</div>
        <components.labels.Success text={"All of your bids have been revealed! DO NOT forget the final step of claiming any auctions that have been won."} />
        <div className='mt-8 max-w-sm m-auto'>
          <div className='mt-8'>
            <components.buttons.Button text={'Backup my data'} onClick={this.backup} disabled={this.state.hasBackedUp} />
          </div>
          <div className='mt-4'>
            <components.buttons.Button text={'View my bids'} disabled={!this.state.hasBackedUp} onClick={(navigate) => {
              this.props.onComplete()
              services.linking.navigate(navigate, 'SunriseAuctionMyBids')
            }} />
          </div>
        </div>
      </>
    )
  }

  renderHasError() {
    return (
      <>
        <div className='font-bold border-b border-gray-400 pb-4 mb-4'>{'Error'}</div>
        <components.labels.Error text={"We've encountered an error with your registration. Please reload the page and try again."} />
        <div className='mt-8 max-w-sm m-auto'>
          <components.buttons.Button text={'Reload page'} onClick={() => window.location.reload()} />

        </div>
      </>
    )
  }

  render() {
    if (this.props.hasError) return this.renderHasError()
    if (!this.state.connected) return this.renderConnect()
    if (Object.keys(this.props.bundles).length !== Object.keys(this.props.revealedBundles).length) return this.renderReveal()
    if (!this.state.wavax) return this.renderWavax()
    return this.renderComplete()
  }
}

const mapStateToProps = (state) => ({
  names: services.sunrise.selectors.names(state),
  bundles: services.sunrise.selectors.bundles(state),
  bidBundles: services.sunrise.selectors.bidBundles(state),
  revealedBundles: services.sunrise.selectors.revealedBundles(state),
  revealingBundle: selectors.revealingBundle(state),
  hasError: selectors.hasRevealError(state),
})

const mapDispatchToProps = (dispatch) => ({
  revealBundle: (bundleKey) => dispatch(actions.revealBundle(bundleKey))
})


export default connect(mapStateToProps, mapDispatchToProps)(RevealFlow)
