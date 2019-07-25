const { Builder, By, until } = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const $ = require('../utils')
const { login, logout, emptyCart, checkout, getOrders } = require('./automated_orders_common')
const { getProductAttrName, getProductStock, getProductAttrOption } = require('./ids_common')

/**
 * Adds a product to the cart
 */
const addProductToCart = async (driver, baseUrl, product) => {
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

  const siteConfig = config.getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, httpAuth, accountEmail, accountPassword } = siteConfig

  const orders = getOrders(targetSite, targetCountry)
  if (orders.length < 1) {
    throw new Error(`Site ${targetSite}-${targetCountry} doesn't have any orders to process.`)
  }

  let driver = new Builder()
    .usingServer(config.env.browserstackServer)
    .withCapabilities(config.env.capabilities)
    .build()

  try {
    await login(driver, baseUrl, httpAuth, accountEmail, accountPassword)

    // Empty cart
    await emptyCart(driver, baseUrl)

    // Process the orders
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i]

      // Add products to basket
      await $.asyncForEach(order.products, async (product) => {
        await addProductToCart(driver, baseUrl, product)
      })

      // Go to checkout
      await checkout(driver, baseUrl, order)
    }

    await logout(driver, baseUrl)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run