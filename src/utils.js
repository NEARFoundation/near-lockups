import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import getConfig from './config'
import 'regenerator-runtime/runtime';

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

export async function initContract() {
  const near = await connect(Object.assign({deps: {keyStore: new keyStores.BrowserLocalStorageKeyStore()}}, nearConfig))
  window.walletConnection = new WalletConnection(near)
  window.accountId = window.walletConnection.getAccountId()
  window.contract = await new Contract(window.walletConnection.account(), nearConfig.contractName, {
    viewMethods: ['get_foundation_account_id','get_master_account_id','get_lockup_master_account_id','get_min_attached_balance'],
    changeMethods: ['create'],
  })
}

export function logout() {
  window.walletConnection.signOut()
  window.location.replace(window.location.origin + window.location.pathname)
}

export function login() {
  console.log(window.walletConnection);
  window.walletConnection.requestSignIn(nearConfig.contractName)
}