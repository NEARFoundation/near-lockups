import getConfig from "../config";

const readDefaultState = () => {
  try {
    return JSON.parse(window.localStorage.getItem('lockups_local_storage'))
  } catch (err) {
    return {}
  }
}

const defaultState = {
  loading: false,
  config: {
    factory: getConfig(process.env.NODE_ENV || 'development').contractName,
    contract: '',
    network: getConfig(process.env.NODE_ENV || 'development'),
    darkMode: 'light',
    sentTx: null,
    createdLockups: [],
    ledgerKeys: [],
    useMultisig: false,
    ...readDefaultState(),
  }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'config': {
      return {...state, config: action.payload}
    }
    case 'loading': {
      return {...state, loading: action.payload}
    }
    default:
      throw new Error('mutation type not defined')
  }
}

export {reducer, defaultState}
