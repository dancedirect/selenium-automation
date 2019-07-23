const { Builder, By, until } = require('selenium-webdriver')
const _ = require('lodash')
const { env, getSiteConfig } = require('../config')
const $ = require('../utils')
const { login, logout } = require('./automated_orders_common')

// Application config
const config = {
  ...env
}

// Current site config
let siteConfig

// Input capabilities
const capabilities = {
  'browserName': 'Chrome',
  'browser_version': '76.0 beta',
  'os': 'OS X',
  'os_version': 'Mojave',
  'resolution': '1280x960',
  'browserstack.user': config.browserstackUsername,
  'browserstack.key': config.browserstackAccessKey,
  'name': 'Automated order'
}

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  siteConfig = getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, httpAuth, accountEmail, accountPassword } = siteConfig

  let driver = new Builder()
    .usingServer('http://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(capabilities)
    .build()

  try {
    await login(driver, baseUrl, httpAuth, accountEmail, accountPassword)
    await logout(driver, baseUrl)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run