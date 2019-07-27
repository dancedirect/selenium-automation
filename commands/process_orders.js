const { Builder } = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const $ = require('../utils')
const { login, logout, emptyCart, checkout, getOrders } = require('./common')

let driver

const onExit = async () => {
  if (driver) {
    await driver.quit()
    driver = undefined
  }
}

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry, orders_file: ordersFile = 'orders.json' } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  if (_.isEmpty(targetCountry)) {
    throw new Error('"target_country" is required.')
  }

  // Get common stuff
  const { addProductToCart, paymentCheckout } = require(`./${targetSite}_common`)

  // Get site config
  const siteConfig = config.getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, accountEmail, accountPassword } = siteConfig

  // Get all the orders for the site and country
  const orders = await getOrders($.getDataFile(ordersFile), targetSite, targetCountry)
  if (orders.length < 1) {
    throw new Error(`Site ${targetSite}-${targetCountry} doesn't have any orders to process.`)
  }

  console.log('Processing orders from:', $.getDataFile(ordersFile))

  driver = new Builder()
    .usingServer(config.env.browserstackServer)
    .withCapabilities({
      ...config.env.capabilities,
      name: `process_orders/${targetSite}-${targetCountry}/${Math.floor(Date.now() / 1000)}/${ordersFile}`,
    })
    .build()

  try {
    console.log('Site login.')
    await login(driver, baseUrl, config.env.httpAuthRequired, accountEmail, accountPassword)
    console.log('Site login completed.')

    // Empty cart
    console.log('Emptying cart.')
    await emptyCart(driver, baseUrl)
    console.log('Cart is now empty.')

    // Process the orders
    for (let i = 0; i < orders.length; i++) {
      console.log(`Processing order #${i+1}.`)
      const order = orders[i]

      // Add products to basket
      let productsAdded = 0
      await $.asyncForEach(order.products, async (product) => {
        console.log(`Adding product to cart:`, product.url)
        try {
          await addProductToCart(driver, baseUrl, product)
          productsAdded++
        } catch (err) {
          console.log('Product could not be added to cart:', err)
        }
      })

      // Go to checkout
      if (productsAdded > 0) {
        console.log('Starting checkout.')
        const orderNumber = await checkout(driver, baseUrl, order, paymentCheckout)
        console.log('Confirmation #:', orderNumber)
        console.log('Checkout completed.')
      } else {
        console.log(`Checkout could not be completed because the cart was empty.`)
      }

      // Force login
      if (i + 1 < orders.length) {
        await logout(driver, baseUrl)
        await login(driver, baseUrl, false, accountEmail, accountPassword)
      }

      console.log(`Finished processing order #${i+1}.`)
    }

    await logout(driver, baseUrl)
    await onExit()
  } catch (err) {
    await onExit()
    throw err
  }
}

exports.run = run
exports.onExit = onExit
