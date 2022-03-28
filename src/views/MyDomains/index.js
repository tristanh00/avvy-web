import React from 'react'
import { connect } from 'react-redux'
import { ArrowRightIcon } from '@heroicons/react/solid'
import { Link } from 'react-router-dom'

import components from 'components'
import services from 'services'


class MyDomains extends React.PureComponent {
  componentDidMount() {
    services.provider.addEventListener(services.provider.EVENTS.CONNECTED, this.onConnect.bind(this))
    this.loadDomains()
  }

  componentWillUnmount() {
    services.provider.addEventListener(services.provider.EVENTS.CONNECTED, this.onConnect.bind(this))
  }

  onConnect() {
    if (this.connectModal) {
      this.connectModal.hide()
    }
    this.loadDomains()
  }

  loadDomains() {
    if (services.provider.isConnected()) {
      this.props.loadDomains()
    }
  }

  renderSealedDomain(hash, index) {
    return (
      <>
        Hidden
      </>
    )
  }

  renderRevealedDomain(hash, index) {
    const reverseLookups = this.props.reverseLookups
    const domain = reverseLookups[hash] 
    return (
      <Link
        key={index}
        to={services.linking.path('Domain', { domain })}
        className="flex justify-between bg-gray-100 dark:bg-gray-800 font-bold p-4 rounded mb-2">
        <div>{domain}</div>
        <ArrowRightIcon className="h-6" />
      </Link>
    )
  }

  renderHiddenDomainsNotice(domainCount) {
    return (
      <div className='mb-4'>
        <components.labels.Information text={`You have ${domainCount} private ${domainCount === 1 ? 'domain' : 'domains'} in your wallet.`} />
        <div className='max-w-md m-auto'>
          <div className='mt-4 text-gray-700'>
            {"Domains are stored privately on the blockchain so that an observer cannot know which domains you have registered. To reveal your domains, search for them below."}
          </div>
          <div className='mt-4 mb-8'>
            <components.DomainSearch placeholder={'Reveal private domains'} />
          </div>
        </div>
      </div>
    )
  }

  renderDomains() {
    const reverseLookups = this.props.reverseLookups
    const domains = this.props.domainIds.filter(domain => reverseLookups[domain])
    const hiddenDomainCount = this.props.domainIds.length - domains.length
    return (
      <div className='mt-8'>
        {hiddenDomainCount > 0 ? this.renderHiddenDomainsNotice(hiddenDomainCount) : null}
        {domains.map((domain, index) => this.renderRevealedDomain(domain, index))}
      </div>
    )
  }

  renderEmpty() {
    return (
      <div className='max-w-md m-auto'>
        <components.labels.Information text={'You do not have any registered domains'} />
        <div className='mt-8'>
          <components.DomainSearch />
        </div>
      </div>
    )
  }

  renderNotConnected() {
    return (
      <div className='max-w-md m-auto'>
        <components.labels.Information text={'You must be connected to a wallet to view your domains'} />
        <div className='mt-8'>
          <components.buttons.Button text={'Connect your wallet'} onClick={() => this.connectModal.toggle()} />
        </div>
      </div>
    )
  }

  renderDomainSection() {
    const domainCount = this.props.domainCount 
    if (!services.provider.isConnected()) return this.renderNotConnected()
    if (domainCount === null) return (
      <div className='text-center w-full mt-8'>
        <components.Spinner size='md' color={this.props.isDarkmode ? '#eee' : '#555'} />
      </div>
    )
    if (domainCount === 0) return this.renderEmpty()
    return this.renderDomains()
  }

  render() {
    return ( 
      <div className='max-w-screen-md m-auto'>
        <components.Modal ref={(ref) => this.connectModal = ref} title={'Connect your wallet'}> 
          <components.ConnectWallet />
        </components.Modal>
        <div className='mt-4 mb-4 text-lg text-center font-bold'>{"My Domains"}</div>
        {this.renderDomainSection()}
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  domainIds: services.user.selectors.domainIds(state),
  domainCount: services.user.selectors.domainCount(state),
  reverseLookups: services.names.selectors.reverseLookups(state),
  isDarkmode: services.darkmode.selectors.isDarkmode(state),
})

const mapDispatchToProps = (dispatch) => ({
  loadDomains: () => dispatch(services.user.actions.loadDomains()),
})

export default connect(mapStateToProps, mapDispatchToProps)(MyDomains)
