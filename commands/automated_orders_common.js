const { By, until } = require('selenium-webdriver')
const config = require('../config')
const $ = require('../utils')

/**
 * Executes the login flow.
 */
const login = async (driver, baseUrl, httpAuth, accountEmail, accountPassword) => {
  let homeUrl = baseUrl
  if (httpAuth) {
    homeUrl = homeUrl.replace('://', `://${config.env.httpAuthUser}:${config.env.httpAuthPassword}@`)
  }

  // Go to home page
  await driver.get(homeUrl)
  let title = await driver.getTitle()
  if (!$.stringIncludes('Home', title)) {
    throw new Error('Home page landing failed.')
  }

  // Accept cookies
  try {
    const cookieAllow = await driver.wait(until.elementLocated(By.id('btn-cookie-allow')), 5000, undefined, 1000)
    await cookieAllow.click()
  } catch (err) {
  }

  // Go to login page and login
  const loginLink = await driver.findElement(By.css('body > .page-wrapper > .page-header > .header > .authorization-link > a'))
  const loginUrl = await loginLink.getAttribute('href')
  await driver.navigate().to(loginUrl)
  title = await driver.getTitle()
  if (!$.stringIncludes('Login', title)) {
    throw new Error('Login page landing failed.')
  }

  await driver.findElement(By.name('login[username]')).sendKeys(accountEmail)
  await driver.findElement(By.name('login[password]')).sendKeys(accountPassword)
  await driver.findElement(By.id('send2')).click()

  await driver.navigate().to(`${baseUrl}/customer/account/`)
  title = await driver.getTitle()
  if (!$.stringIncludes('Dashboard', title)) {
    throw new Error('Login Failed.')
  }
}

/**
 * Executes the Logout flow.
 */
const logout = async (driver, baseUrl) => {
  await driver.get(`${baseUrl}/customer/account/logout/`)
  await driver.wait(async () => {
    const title = await driver.getTitle()
    return $.stringIncludes('Home', title)
  }, 30000, undefined, 1000)
}

exports.login = login
exports.logout = logout
