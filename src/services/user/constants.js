import reduxService from 'services/redux'

const constants = reduxService.prepareConstants(
  'services/user',
  [
    'SET_DOMAIN_IDS',
    'SET_DOMAIN_COUNT',

    'SET_TOKEN', 
  ]
)

export default constants
