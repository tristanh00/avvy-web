import { reducerName } from './reducer'

const root = (state) => state[reducerName]

const selectors = {
  auctionPhases: (state) => root(state).auctionPhases,
  proofProgress: (state) => root(state).proofProgress,
  pricingProofs: (state) => root(state).pricingProofs,
  constraintsProofs: (state) => root(state).constraintsProofs,
  hasBidError: (state) => root(state).hasBidError,
  biddingIsComplete: (state) => root(state).biddingIsComplete,
  biddingInProgress: (state) => root(state).biddingInProgress,
  revealingBundle: (state) => root(state).revealingBundle,
  hasRevealError: (state) => root(state).hasRevealError,
}

export default selectors
