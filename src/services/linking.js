//
// This file is responsible for generating links throughout the
// application, so that if a path needs to be changed it's not
// a difficult task.
//

import linkingService from 'services/linking'

const paths = {
  Domain: '/domains/:domain',
  Landing: '/',
  MyDomains: '/user/domains',
  SunriseAuction: '/sunrise',
}

const linkingEvents = new EventTarget()

const linking = {

  // generates the path, to be used in links
  path: (pathName, params) => {
    let path = paths[pathName]
    if (!path) throw new Error(`Missing path "${pathName}". Check services/linking.js.`)
    if (params) {
      for (let key in params) {
        path = path.replace(`:${key}`, params[key])
      }
    }
    return path
  },

  // extracts url params from the current url
  getParams: (pathName) => {
    const tpl = paths[pathName].split('/')
    const path = window.location.pathname.split('/')
    const params = {}
    for (let i = 0; i < tpl.length; i += 1) {
      if (tpl[i][0] === ':') {
        params[tpl[i].substr(1)] = path[i]
      }
    }
    return params
  },

  // listen for param changes
  addEventListener: (pathName, callback) => {
    linkingEvents.addEventListener(pathName, callback)
  },

  // stop listening for param changes
  removeEventListener: (pathName, callback) => {
    linkingEvents.removeEventListener(pathName, callback)
  },

  // performs a navigation
  // we need to make sure to update any
  // existing components
  navigate: (navigator, pathName, params) => {
    navigator(linkingService.path('Domain', params))
    linkingEvents.dispatchEvent(
      new Event(pathName)
    )
  },

  // returns the url for a static file
  static: (path) => {
    return `/${path}`
  }
}

export default linking
