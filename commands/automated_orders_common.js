const { By, until } = require('selenium-webdriver')
const _ = require('lodash')
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

/**
 * Empties the shopping cart.
 */
const emptyCart = async (driver, baseUrl) => {
  await driver.get(`${baseUrl}/checkout/cart/`)

  let cart
  try {
    cart = await driver.findElement(By.id('shopping-cart-table'))
  } catch (err) {
    return
  }

  // Wait for the shipping info to load
  await driver.wait(until.elementLocated(By.id('shipping-zip-form')), 30000, undefined, 1000)

  // Wait until the shipping form has loaded
  await $.sleep(5000)
  await driver.wait(until.elementLocated(By.id('co-shipping-method-form')), 30000, undefined, 1000)
  await driver.wait(async (newDriver) => {
    const shippingForm = await newDriver.findElement(By.id('co-shipping-method-form'))
    const shippingFormClass = await shippingForm.getAttribute('class')
    return shippingFormClass.indexOf('_block-content-loading') < 0
  }, 30000, undefined, 10000)

  // Wait until the cart total have loaded
  await driver.wait(until.elementLocated(By.id('cart-totals')), 30000, undefined, 1000)
  await driver.wait(async (newDriver) => {
    const cartTotals = await newDriver.findElement(By.id('cart-totals'))
    try {
      const loadingContent = await cartTotals.findElement(By.css('._block-content-loading'))
      return loadingContent.length < 1
    } catch (err) {
      return true
    }
  }, 30000, undefined, 10000)

  // Get the cart item lines
  let cartItemLines = await cart.findElements(By.css('.item-info'))
  let cartItemLineCount = cartItemLines.length
  const cartItemLineIterations = _.range(cartItemLineCount)

  await $.asyncForEach(cartItemLineIterations, async () => {
    cart = await driver.findElement(By.id('shopping-cart-table'))
    cartItemLines = await cart.findElements(By.css('.item-info'))
    cartItemLine = cartItemLines[0]

    const deleteAction = await cartItemLine.findElement(By.css('.action.action-delete'))
    await $.scrollElementIntoView(driver, deleteAction)
    await deleteAction.click()

    await driver.wait(async (newDriver) => {
      try {
        await newDriver.findElement(By.css('.cart-empty'))
        return true
      } catch (err) {
      }

      try {
        const newCart = await newDriver.findElement(By.id('shopping-cart-table'))
        const newCartItemLines = await newCart.findElements(By.css('.item-info'))
        if (newCartItemLines.length === cartItemLineCount - 1) {
          cartItemLineCount--
          return true
        }
      } catch (err) {
      }

      return false
    }, 30000, undefined, 1000)
  })

  try {
    cart = await driver.findElement(By.id('shopping-cart-table'))
    cartItemLines = await cart.findElements(By.css('.item-info'))
    cartItemLineCount = cartItemLines.length
  } catch (err) {
  }
}

exports.login = login
exports.logout = logout
exports.emptyCart = emptyCart
