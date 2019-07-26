const { Builder } = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const $ = require('../utils')
const { login, logout, emptyCart, checkout, getOrders } = require('./common')

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry, orders_file: ordersFile = 'orders.json' } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  if (_.isEmpty(targetCountry)) {
    throw new Error('"target_country" is required.')
  }

  // Get common stuff
  const { addProductToCart } = require(`./${targetSite}_common`)

  // Get site config
  const siteConfig = config.getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, accountEmail, accountPassword } = siteConfig

  // Get all the orders for the site and country
  const orders = await getOrders($.getDataFile(ordersFile), targetSite, targetCountry)
  if (orders.length < 1) {
    throw new Error(`Site ${targetSite}-${targetCountry} doesn't have any orders to process.`)
  }

  const driver = new Builder()
    .usingServer(config.env.browserstackServer)
    .withCapabilities({
      ...config.env.capabilities,
      name: `process_orders/${ordersFile}`,
    })
    .build()

  try {
    await login(driver, baseUrl, config.env.httpAuthRequired, accountEmail, accountPassword)

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

      // Force login
      if (i + 1 < orders.length) {
        await logout(driver, baseUrl)
        await login(driver, baseUrl, false, accountEmail, accountPassword)
      }
    }

    await logout(driver, baseUrl)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run
