import { reducerName } from './reducer'

const root = (state) => state[reducerName]

const selectors = {
  auctionPhases: (state) => root(state).auctionPhases,
  proofProgress: (state) => root(state).proofProgress,
  hasBidError: (state) => root(state).hasBidError,
  biddingIsComplete: (state) => root(state).biddingIsComplete,
  biddingInProgress: (state) => root(state).biddingInProgress,
  revealingBundle: (state) => root(state).revealingBundle,
  hasRevealError: (state) => root(state).hasRevealError,
  gettingWAVAX: (state) => root(state).gettingWAVAX,
  auctionResults: (state) => root(state).auctionResults,
  isLoadingWinningBids: (state) => root(state).loadingWinningBids,
  availableWavax: (state) => root(state).availableWavax,
  approvedWavax: (state) => root(state).approvedWavax,
  isApprovingWavax: (state) => root(state).isApprovingWavax,
  isClaimingDomains: (state) => root(state).isClaimingDomains,
  winningBidsLoaded: (state) => root(state).winningBidsLoaded,
}

export default selectors
