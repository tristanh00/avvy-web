import React from 'react'
import { connect } from 'react-redux'
import { ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/solid'

import services from 'services'
import components from 'components'

import actions from './actions'
import constants from './constants'
import reducer from './reducer'
import selectors from './selectors'

import RegistrationFlow from './RegistrationFlow'


class Register extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      paginationIndex: 0,
      connected: services.provider.isConnected(),
      importingRegistrations: false,
    }
  } 

  componentDidMount() {
    services.linking.addEventListener('Domain', this.updateParams)
    services.provider.addEventListener(services.provider.EVENTS.CONNECTED, this.onConnect.bind(this))
  }

  componentWillUnmount() {
    services.linking.removeEventListener('Domain', this.updateParams)
    services.provider.addEventListener(services.provider.EVENTS.CONNECTED, this.onConnect.bind(this))
  }

  onConnect() {
    if (this.connectModal) {
      this.connectModal.hide()
    }
    this.setState({
      connected: true
    })
    this.props.refreshNameData()
  }

  incrementQuantity(name) {
    this.props.incrementQuantity(name)
  }

  decrementQuantity(name) {
    this.props.decrementQuantity(name)
  }

  removeFromCart(name) {
    this.props.removeFromCart(name)
  }

  cancelRegistration = () => {
    if (window.confirm('Are you sure?')) {
      this.props.clear()
    }
  }

  removeUnavailable() {
    this.props.names.forEach(name => {
      const nameData = this.props.nameData[name]
      const validStatuses = [
        nameData.constants.DOMAIN_STATUSES.AVAILABLE,
        nameData.constants.DOMAIN_STATUSES.REGISTERED_SELF,
      ]
      if (validStatuses.indexOf(nameData.status) === -1) {
        this.props.removeFromCart(name)
      }
    })
  }

  startPurchase() {
    this.props.resetRegistration()
    this.registrationModal.toggle()
  }

  renderPagination(numPages) {
    numPages = Math.ceil(numPages)
    const currPage = this.state.paginationIndex
    let pagesDisplayed = []
    const maxPagesToDisplay = 5
    if (currPage === 0 || currPage === 1) {
      for (let i = 0; i < numPages; i += 1) {
        pagesDisplayed.push(i+1)
        if (pagesDisplayed.length >= maxPagesToDisplay) break
      }
    } else if (currPage === numPages - 1 || currPage === numPages - 2) {
      for (let i = numPages - 5; i < numPages; i += 1) {
        if (i + 1 > 0) {
          pagesDisplayed.push(i+1)
        }
        if (pagesDisplayed.length >= maxPagesToDisplay) break
      }
    } else {
      pagesDisplayed = [
        currPage - 1,
        currPage,
        currPage + 1,
        currPage + 2,
        currPage + 3,
      ]
    }
    return (
      <div className='flex items-center justify-center'>
        <div 
          onClick={() => {
            this.setState(currState => {
              const currPage = this.state.paginationIndex
              const nextPage = currPage === 0 ? currPage : currPage - 1
              return {
                paginationIndex: nextPage
              }
            })
          }}
          className='dark:bg-gray-800 bg-gray-100 rounded-lg select-none w-12 h-12 flex items-center justify-center mr-2 cursor-pointer'>
          <ChevronLeftIcon className='w-6' />
        </div>
        {pagesDisplayed.map((p, index) => (
          <div 
            onClick={() => {
              this.setState({
                paginationIndex: p - 1
              })
            }}
            className={`dark:bg-gray-800 cursor-pointer select-none bg-gray-100 rounded-lg w-12 h-12 flex items-center justify-center mr-2 ${currPage === p - 1 ? 'font-bold' : ''}`} key={index}>{p}
          </div>
        ))}
        <div 
          onClick={() => {
            this.setState(currState => {
              const currPage = this.state.paginationIndex
              const nextPage = currPage >= numPages - 1 ? currPage : currPage + 1
              return {
                paginationIndex: nextPage
              }
            })
          }}
          className='dark:bg-gray-800 bg-gray-100 rounded-lg select-none w-12 h-12 flex items-center justify-center mr-2 cursor-pointer'>
          <ChevronRightIcon className='w-6' />
        </div>
      </div>
    )
  }

  renderNameData(name) {
    const nameData = this.props.nameData[name]
    if (!nameData) return null
    return (
      <div className='text-gray-400 font-bold text-sm'>{services.money.renderUSD(nameData.priceUSDCents)} / year</div>
    )
  }

  renderQuantity(name) {
    const nameData = this.props.nameData[name]
    if (!nameData) return null
    const quantity = this.props.quantities[name]
    const itemTotal = services.money.mul(quantity, nameData.priceUSDCents)
    return (
      <div className='max-w-sm select-none'>
        <div className='flex items-center'>
          <div className='p-4 cursor-pointer' onClick={() => this.decrementQuantity(name)}>
            <MinusCircleIcon className='w-8 text-gray-800 dark:text-gray-300' />
          </div>
          <div className='text-center text-sm'>
            <div className='font-bold'>{quantity} {parseInt(quantity) === 1 ? 'year' : 'years'}</div>
            <div className=''>{services.money.renderUSD(itemTotal)}</div>
          </div>
          <div className='p-4 cursor-pointer' onClick={() => this.incrementQuantity(name)}>
            <PlusCircleIcon className='w-8 text-gray-800 dark:text-gray-300' />
          </div>
        </div>
        <div className='cursor-pointer text-gray-400 mt-4 text-xs text-center sm:mt-2' onClick={() => this.removeFromCart(name)}>
          Remove
        </div>
      </div>
    )
  }

  renderNotAvailable(name, status) {
    return (
      <div className='bg-gray-100 rounded-lg mb-4 p-4'>
        {name} {'is not available for registration'}
      </div>
    )
  }

  initBulkRegistrations = () => {
    this.setState({
      importingRegistrations: false,
    }, () => {
      this.bulkModal.toggle()
    })
  }

  renderName(name, index) {
    const nameData = this.props.nameData[name]
    if (!nameData) return null
    if (nameData.status !== nameData.constants.DOMAIN_STATUSES.AVAILABLE && nameData.status !== nameData.constants.DOMAIN_STATUSES.REGISTERED_SELF) return null
    const isRenewal = nameData.status === nameData.constants.DOMAIN_STATUSES.REGISTERED_SELF
    return (
      <div key={index} className='bg-gray-100 rounded-lg mb-4 p-4 dark:bg-gray-800'>
        <div className='flex justify-between flex-col items-center sm:flex-row'>
          <div className='text-center sm:text-left'>
            <div className='font-bold sm:text-xl'>{name}</div>
            {this.renderNameData(name)}
            {isRenewal ? (
              <div className='mt-2'>
                <span className='text-xs bg-gray-200 dark:bg-gray-600 py-1 px-2 rounded'>Renewal</span>
              </div>
            ) : null}
          </div>
          {this.renderQuantity(name)}
        </div>
      </div>
    )
  }

  renderNames() {
    if (!this.props.names || this.props.names.length === 0) return (
      <div className='max-w-md m-auto'>
        <div className='mb-8'>
          <components.labels.Information text={"You haven't selected any names to register"} />
        </div>
        <components.DomainSearch />
        <div className='mt-4 text-center text-gray-500 text-sm'>
          <div className='underline cursor-pointer' onClick={() => this.initBulkRegistrations()}>{'Want to register in bulk?'}</div>
        </div>
      </div>
    )
    if (this.props.isRefreshingNameData) return (
      <div className='text-center w-full'>
        <components.Spinner size='md' color={this.props.isDarkmode ? '#ddd' : '#555'} />
      </div>
    )
    let names = Array.from(this.props.names).sort((a, b) => a > b ? 1 : -1)
    const nameData = this.props.nameData
    const quantities = this.props.quantities
    for (let i = 0; i < names.length; i += 1) {
      if (!nameData[names[i]] || !quantities[names[i]]) {
        console.log('missing namedata')
        console.log(names[i])
        return null
      }
    }
    const unavailable = []
    const total = names.reduce((sum, curr) => {
      if (nameData[curr].status !== nameData[curr].constants.DOMAIN_STATUSES.AVAILABLE && nameData[curr].status !== nameData[curr].constants.DOMAIN_STATUSES.REGISTERED_SELF) {
        unavailable.push(curr)
        return sum
      }
      const namePrice = nameData[curr].priceUSDCents
      const namePriceAvax = nameData[curr].priceAVAXEstimate
      if (!namePrice || !namePriceAvax) return {
        usd: '0',
        avax: '0'
      }
      const quantity = quantities[curr]
      const registrationPrice = services.money.mul(namePrice, quantity)
      const registrationPriceAvax = services.money.mul(namePriceAvax, quantity)
      return {
        usd: services.money.add(sum.usd, registrationPrice),
        avax: services.money.add(sum.avax, registrationPriceAvax),
      }
    }, {usd: '0', avax: '0'})
    if (unavailable.length > 0) return (
      <div className='mb-4'>
        <components.labels.Error text={`${unavailable.join(', ')} ${unavailable.length === 1 ? 'is' : 'are'}  no longer available for registration.`} />
        <div className='mt-8 max-w-sm m-auto'>
          <components.buttons.Button text={'Continue'} onClick={() => this.removeUnavailable()} />
        </div>
      </div>
    )

    const pageLength = 5
    const hasPagination = names.length > pageLength
    const numPages = names.length / pageLength
    names = names.slice(this.state.paginationIndex * pageLength, this.state.paginationIndex * pageLength + pageLength)

    return (
      <>
        {names.map(this.renderName.bind(this))}
        {hasPagination ? this.renderPagination(numPages) : null}
        <div className='max-w-md m-auto mt-8'>
          <div className='m-auto mb-8 max-w-xs'>
            <div className='border-b border-gray-400 pb-4 mb-4'>
              <div className='text-lg text-center font-bold'>{'Purchase Summary'}</div>
              <div className='text-md text-center text-gray-500'>{'(Estimated)'}</div>
            </div>
            <div className='flex justify-between'>
              <div className='font-bold'>
                {"Total"}
              </div>
              <div className=''>
                {services.money.renderUSD(total.usd)}
              </div>
            </div>
            <div className='flex justify-between'>
              <div className='font-bold'>
                {"Total (AVAX)"}
              </div>
              <div className=''>
                {services.money.renderAVAX(total.avax)}
              </div>
            </div>
          </div>
          <div className='my-8'>
            <components.labels.Information text={'Registrations are priced in USD, but payable in AVAX. Amounts noted are estimates; actual price will be determined in future steps.'} />
          </div>
          <components.buttons.Button text={'Continue Registration'} onClick={this.startPurchase.bind(this)} />
          <div className='mt-4 text-center text-gray-500 text-sm'>
            <div className='underline cursor-pointer' onClick={() => this.cancelRegistration()}>{'Cancel registration'}</div>
          </div>
        </div>
      </>
    )
  }

  renderNotConnected() {
    return (
      <div className='max-w-md m-auto'>
        <components.labels.Information text={'You must be connected to a wallet to register domains'} />
        <div className='mt-8'>
          <components.buttons.Button text={'Connect your wallet'} onClick={() => this.connectModal.toggle()} />
        </div>
      </div>
    )
  }

  downloadBulkBidTemplate() {
    services.files.download(
      'Domain Name,Registration Length (years)\navvydomains.avax,1',
      'text/csv',
      'avvy-registration-template.csv',
    )
  }

  async uploadBulkBidTemplate(navigator) {
    const data = await services.files.upload()
    const lines = data.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    const registrations = {}
    for (let i = 0; i < lines.length; i += 1) {
      if (i > 0) {
        let split = lines[i].split(',')
        registrations[split[0]] = split[1]
      }
    }
    this.props.addBulkRegistrations(registrations)
    this.setState({
      importingRegistrations: true
    })
  }

  render() {
    return (
      <div>
        <components.Modal ref={(ref) => this.bulkModal = ref} title={this.state.connected ? 'Bulk register' : 'Connect wallet'}>
          {this.state.importingRegistrations ? ( 
            <div className='max-w-sm m-auto'> 
              <div className='mb-4 font-bold text-center '>Importing Registrations</div>
              <div className='mb-4'>
                <components.ProgressBar progress={this.props.bulkRegistrationProgress} />
              </div>
              <components.buttons.Button text={'Close'} disabled={this.props.bulkRegistrationProgress < 100} onClick={() => this.bulkModal.toggle()} />
            </div>
          ) : this.state.connected ? (
            <>
              <div className='mb-4'>{'To register names in bulk, follow the steps below.'}</div>
              <ol className='list-decimal pl-4'>
                <li><span className='underline cursor-pointer' onClick={this.downloadBulkBidTemplate.bind(this)}>{'Download our bulk-registration template'}</span>{' and edit it as described in the following steps.'}</li>
                <li>{'In the '}<span className='font-bold'>{'Domain Name'}</span>{' column, enter the name you wish to register (or renew). You must include the .avax extension. Any names that are not of the format '}<span className='font-bold'>{'nametoregister.avax'}</span>{' will be disregarded.'}</li>
                <li>{'In the '}<span className='font-bold'>Registration Length</span>{' column, include the number of years you wish to register the domain for. You can register names for a maximum of 5 years into the future.'}</li>
                <li>{'Upload the edited template.'}</li>
              </ol>
              <div className='mt-8 max-w-sm m-auto'>
                <components.buttons.Button text='Upload template' onClick={(navigator) => this.uploadBulkBidTemplate(navigator)} />
              </div>
            </>
          ) : (
            <components.ConnectWallet />
          )}
        </components.Modal>
        <components.Modal ref={(ref) => this.registrationModal = ref} onClose={() => {
          const answer = window.confirm('Closing this window will cancel your registration. Are you sure you want to proceed?')
          return answer
        }}> 
          <RegistrationFlow ref={(ref) => this.registrationFlow = ref} />
        </components.Modal>
        <components.Modal ref={(ref) => this.connectModal = ref} title={'Connect your wallet'}> 
          <components.ConnectWallet />
        </components.Modal>
        <div className='mt-4 mb-4 text-lg text-center font-bold'>{'Register'}</div>
        {this.state.connected ? this.renderNames() : this.renderNotConnected()}
      </div>
    )
  }
}

const mapStateToProps = (state) => ({
  names: services.cart.selectors.names(state),
  nameData: services.cart.selectors.nameData(state),
  quantities: services.cart.selectors.quantities(state),
  isRefreshingNameData: services.cart.selectors.isRefreshingNameData(state),
  isDarkmode: services.darkmode.selectors.isDarkmode(state),
  bulkRegistrationProgress: services.cart.selectors.bulkRegistrationProgress(state),
})

const mapDispatchToProps = (dispatch) => ({
  removeFromCart: (name) => dispatch(services.cart.actions.removeFromCart(name)),
  incrementQuantity: (name) => dispatch(services.cart.actions.incrementQuantity(name)),
  decrementQuantity: (name) => dispatch(services.cart.actions.decrementQuantity(name)),
  refreshNameData: () => dispatch(services.cart.actions.refreshAllNameData()),
  resetRegistration: () => dispatch(actions.reset()),
  addBulkRegistrations: (registrations) => dispatch(services.cart.actions.addBulkRegistrations(registrations)),
  clear: () => dispatch(services.cart.actions.clear()),
})

const component = connect(mapStateToProps, mapDispatchToProps)(Register)

component.redux = {
  actions,
  constants,
  reducer,
  selectors,
}

export default component
