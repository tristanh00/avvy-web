import services from 'services'

import constants from './constants'
import selectors from './selectors'

const actions = {
  setSalt: (salt) => {
    return {
      type: constants.SET_SALT,
      salt
    }
  },

  setHash: (hash) => {
    return {
      type: constants.SET_HASH,
      hash
    }
  },

  setProgress: (progress) => {
    return {
      type: constants.SET_PROGRESS,
      progress
    }
  },

  setIsCommitting:(value) => {
    return {
      type: constants.SET_IS_COMMITTING,
      value
    }
  },

  setIsFinalizing:(value) => {
    return {
      type: constants.SET_IS_FINALIZING,
      value
    }
  },

  setHasCommit: (value) => {
    return {
      type: constants.SET_HAS_COMMIT,
      value
    }
  },

  setHasError: (value) => {
    return {
      type: constants.SET_HAS_ERROR,
      value
    }
  },

  setIsComplete: (value) => {
    return {
      type: constants.SET_IS_COMPLETE,
      value
    }
  },

  reset: () => {
    return (dispatch, getState) => {
      dispatch(actions.setIsComplete(false))
      dispatch(actions.setHasCommit(false))
      dispatch(actions.setIsFinalizing(false))
      dispatch(actions.setIsCommitting(false))
      dispatch(actions.setProgress(0))
    }
  },

  generateProofs: (names) => {
    return async (dispatch, getState) => {
      try {
        const api = services.provider.buildAPI()
        const state = getState()
        const constraintsProofs = services.proofs.selectors.constraintsProofs(state)
        const pricingProofs = services.proofs.selectors.pricingProofs(state)
        let j = 0;
        const numSteps = names.length * 2
        for (let i = 0; i < names.length; i += 1) {
          let name = names[i]
          if (!pricingProofs[name]) {
            dispatch(actions.setProgress({
              message: `Generating pricing proof for ${name} (${j+1}/${numSteps})`,
              percent: parseInt((j / numSteps) * 100)
            }))
            let pricingRes = await api.generateDomainPriceProof(name)
            dispatch(services.proofs.actions.setPricingProof(name, pricingRes.calldata))
          }
          j += 1
          if (!constraintsProofs[name]) {
            dispatch(actions.setProgress({
              message: `Generating constraints proof for ${name} (${j+1}/${numSteps})`,
              percent: parseInt((j / numSteps) * 100),
            }))
            let constraintsRes = await api.generateConstraintsProof(name)
            dispatch(services.proofs.actions.setConstraintsProof(name, constraintsRes.calldata))
          }
          j += 1
        }
        dispatch(actions.setProgress({
          message: `Done`,
          percent: 100,
        }))
      } catch (err) {
        console.log(err)
        dispatch(actions.setHasError(true))
      }
    }
  },

  commit: (names, quantities) => {
    return async (dispatch, getState) => {
      try {
        dispatch(actions.setIsCommitting(true))
        const state = getState()
        const api = services.provider.buildAPI()
        let names = services.cart.selectors.names(state)
        const _quantities = services.cart.selectors.quantities(state)
        const _constraintsProofs = services.proofs.selectors.constraintsProofs(state)
        const _pricingProofs = services.proofs.selectors.pricingProofs(state)
        let quantities = []
        let pricingProofs = []
        let constraintsProofs = []
        names = names.slice(0, services.environment.MAX_REGISTRATION_NAMES)
        names.forEach(name => {
          quantities.push(_quantities[name])
          pricingProofs.push(_pricingProofs[name])
          constraintsProofs.push(_constraintsProofs[name])
        })
        let salt = services.random.salt()
        dispatch(actions.setSalt(salt))
        await api.commit(
          names,
          quantities,
          constraintsProofs,
          pricingProofs,
          salt,
        )
        dispatch(actions.setHasCommit(true))
      } catch (err) {
        if (err.code === 4001) {
          dispatch(actions.setIsCommitting(false))
          return // user rejected transaction, give them another chance
        }
        services.logger.error(err)
        dispatch(actions.setHasError(true))
      }
    }
  },

  finalize: () => {
    return async (dispatch, getState) => {
      try {
        dispatch(actions.setIsFinalizing(true))
        const state = getState()
        const api = services.provider.buildAPI()
        let names = services.cart.selectors.names(state)
        const salt = selectors.commitSalt(state)
        const _quantities = services.cart.selectors.quantities(state)
        const _constraintsProofs = services.proofs.selectors.constraintsProofs(state)
        const _pricingProofs = services.proofs.selectors.pricingProofs(state)
        let quantities = []
        let pricingProofs = []
        let constraintsProofs = []
        let hasMore = false
        if (names.length > services.environment.MAX_REGISTRATION_NAMES) {
          hasMore = true
          names = names.slice(0, services.environment.MAX_REGISTRATION_NAMES)
        }
        names.forEach(name => {
          quantities.push(_quantities[name])
          pricingProofs.push(_pricingProofs[name])
          constraintsProofs.push(_constraintsProofs[name])
        })

        const enhancedPrivacy = selectors.enhancedPrivacy(state)
        const reverseLookups = services.names.selectors.reverseLookups(state)

        if (enhancedPrivacy) {
          await api.register(
            names,
            quantities,
            constraintsProofs,
            pricingProofs,
            salt,
          )
        } else {
          const _names = names.map(n => reverseLookups[n])
          const preimages = await api.buildPreimages(names)
          await api.registerWithPreimage(
            names,
            quantities,
            constraintsProofs,
            pricingProofs,
            salt,
            preimages
          )
        }

        dispatch(actions.setIsComplete(true))
        dispatch(services.cart.actions.clearNames(names))
      } catch (err) {
        if (err.code === 4001) {
          dispatch(actions.setIsFinalizing(false))
          return // user rejected transaction, give them another chance
        }
        services.logger.error(err)
        dispatch(actions.setHasError(true))
      }
    }
  },

  enableEnhancedPrivacy: (value) => {
    return {
      type: constants.ENABLE_ENHANCED_PRIVACY, 
      value
    }
  },
}

export default actions
