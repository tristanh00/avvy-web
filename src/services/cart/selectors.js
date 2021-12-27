import { reducerName } from './reducer'

const root = (state) => state[reducerName]

const selectors = {
  names: (state) => root(state).names,
  nameData: (state) => root(state).nameData,
  quantities: (state) => root(state).quantities,
}

export default selectors
