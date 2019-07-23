const { Builder, By, until } = require('selenium-webdriver')
const _ = require('lodash')
const { env, getSiteConfig } = require('../config')
const $ = require('../utils')
const { login, logout, emptyCart } = require('./automated_orders_common')
const { getOrders } = require('../data/orders')

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

const productAttrNameMap = {
  colour: 'color'
}

const getProductAttrName = (name) => {
  let newName = name.replace('control bulk-input ', '').replace(' ', '')
  newName = newName.charAt(0).toLowerCase() + newName.slice(1)
  return productAttrNameMap[newName] || newName
}

const getProductStock = (val) => {
  const regExp = /\(([^)]+)\)/
  const matches = regExp.exec(val)
  if (!matches || matches.length != 2) {
    return false
  }

  return parseInt(matches[1])
}

const getProductAttrOption = async(select, textDesired) => {
  const options = await select.findElements(By.tagName('option'))
  let optionFound
  await $.asyncForEach(options, async(option) => {
      if (optionFound === undefined) {
          let value = await option.getText()
          value = value.replace(/ *\([^)]*\) */g, '').toLowerCase()
          if (value === textDesired.toLowerCase()) {
              optionFound = option
          }
      }
  })

  if (optionFound === undefined) {
      throw new Error(`Option "${textDesired}" not found.`)
  }

  return optionFound
}

/**
 * Adds a product to the cart
 */
const addProductToCart = async (driver, product) => {
  const { url: baseUrl } = siteConfig

  await driver.navigate().to(`${baseUrl}${product.url}`)

  // Wait until the form has been loaded
  const addToCartForm = await driver.wait(until.elementLocated(By.id('product_addtocart_form')), 30000, undefined, 1000)
  await $.scrollElementIntoView(driver, addToCartForm)
  
  // Find the product attribute selects
  const productAttrSelects = await addToCartForm.findElements(By.css('.control.bulk-input'))

  let stockQty = 0
  await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
    let productAttrName = await productAttrSelect.getAttribute('class')
    productAttrName = getProductAttrName(productAttrName)
  
    const productAttrOption = await getProductAttrOption(productAttrSelect.findElement(By.css('select')), product[productAttrName])
    await productAttrOption.click()

    const productAttrValue = await productAttrOption.getText()
    stockQty = getProductStock(productAttrValue)
  })

  // Add to cart
  const counter = await driver.findElement(By.css('.counter-number'))
  await $.scrollElementIntoView(driver, counter)

  let cartItemCount = await $.getCartItemCount(counter)

  if (product.qty <= stockQty) {
    const qtyElem = await addToCartForm.findElement(By.id('qty_0'))
    await $.scrollElementIntoView(driver, qtyElem)
    await qtyElem.clear()
    await qtyElem.sendKeys(`${product.qty}`)
    const qty = await qtyElem.getAttribute('value')
    if (parseInt(qty) !== product.qty) {
      throw new Error('The product qty could not be set.')
    }

    const addToCart = await addToCartForm.findElement(By.id('product-addtocart-button'))
    const addToCartDisabled = await addToCart.getAttribute('disabled')
    if (addToCartDisabled === true) {
      throw new Error('Add to cart button is disabled.')
    }

    await addToCart.submit()

    await driver.wait(async () => {
      const newCartItemCount = await $.getCartItemCount(counter)
      return newCartItemCount === cartItemCount + product.qty
    }, 30000, undefined, 1000)
  }
}

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  siteConfig = getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, httpAuth, accountEmail, accountPassword } = siteConfig

  const orders = getOrders(targetSite, targetCountry)
  if (orders.length < 1) {
    throw new Error(`Site ${targetSite}-${targetCountry} doesn't have any orders to process.`)
  }

  let driver = new Builder()
    .usingServer('http://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(capabilities)
    .build()

  try {
    await login(driver, baseUrl, httpAuth, accountEmail, accountPassword)

    // Empty cart
    await emptyCart(driver, baseUrl)

    // Get the order
    const order = orders[0]

    // Add products to basket
    await $.asyncForEach(order.products, async (product) => {
      await addProductToCart(driver, product)
    })

    await logout(driver, baseUrl)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run