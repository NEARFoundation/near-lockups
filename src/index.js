import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import {initContract} from './utils'
import {ContainerProvider} from './utils/container'
//import './global.css';


window.nearInitPromise = initContract()
  .then(() => {
    ReactDOM.render(
      <ContainerProvider>
        <App/>
      </ContainerProvider>,
      document.querySelector('#root')
    )
  })
  .catch(console.error)
