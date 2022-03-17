import reduxService from 'services/redux'

const constants = reduxService.prepareConstants(
  'views/SunriseAuction',
  [
    'SET_AUCTION_PHASES',
    'SET_PROOF_PROGRESS',
    'SET_HAS_BID_ERROR',
    'SET_BIDDING_IS_COMPLETE',
    'SET_BIDDING_IN_PROGRESS',
    'SET_REVEALING_BUNDLE',
    'SET_HAS_REVEAL_ERROR',
    'ENABLE_ENHANCED_PRIVACY',
    'SET_AUCTION_RESULT',
    'SET_LOADING_WINNING_BIDS',
    'SET_AVAILABLE_WAVAX',
    'SET_APPROVED_WAVAX',
    'SET_IS_APPROVING_WAVAX',
    'SET_IS_CLAIMING_DOMAINS',
    'SET_IS_CLAIMING_DOMAIN',
    'SET_REVEALED_BIDS',
    'WINNING_BIDS_LOADED',
    'SET_GETTING_WAVAX',
  ]
)

export default constants
