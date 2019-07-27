const { Builder } = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const $ = require('../utils')
const { login, logout, getCategoryUrls, getRandomCategoryProductUrl, createOrder, saveOrder, saveOrders, getOrders } = require('./common')

let driver

const onExit = async () => {
  if (driver) {
    await driver.quit()
    driver = undefined
  }
}

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry, orders_file: ordersFile = 'orders.json', mode = 'w', max_orders: maxOrders = 10, max_products: maxProducts = 15 } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  if (_.isEmpty(targetCountry)) {
    throw new Error('"target_country" is required.')
  }

  // Get common stuff
  const { getRandomProductPageNumber, getRandomProductVariant } = require(`./${targetSite}_common`)

  // Get site config
  const siteConfig = config.getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, accountEmail, accountPassword } = siteConfig

  driver = new Builder()
    .usingServer(config.env.browserstackServer)
    .withCapabilities({
      ...config.env.capabilities,
      name: `build_orders/${targetSite}-${targetCountry}/${Math.floor(Date.now() / 1000)}/${ordersFile}`,
    })
    .build()

  try {
    let orders = []
  
    if (mode === 'a') {
      orders = await getOrders($.getDataFile(ordersFile), targetSite, targetCountry)
    } else {
       // Empty the existing orders
      await saveOrders($.getDataFile(ordersFile), targetSite, targetCountry, [])
    }

    await login(driver, baseUrl, config.env.httpAuthRequired, accountEmail, accountPassword)

    // Get the category urls 
    const categoryUrls = await getCategoryUrls(driver)

    // Get orders
    
    const maxOrderTries = 10
    let orderTries = 0

    while (orders.length < maxOrders && orderTries < maxOrderTries) {
      const maxProductsNormalized = $.getRandomNumber(1, maxProducts)
      const maxProductTries = 50
      let productTries = 0
      const products = []
  
      while (products.length < maxProductsNormalized && productTries < maxProductTries) {
        // Get a random category url
        const categoryUrl = $.getRandomArrItem(categoryUrls)
  
        // Get a random product url
        const productUrl = await getRandomCategoryProductUrl(driver, baseUrl, categoryUrl, getRandomProductPageNumber)
  
        // Get a random product variant
        if (productUrl) {
          const product = await getRandomProductVariant(driver, baseUrl, productUrl)
          if (product) {
            products.push(product)
          }
        }
  
        productTries++
      }

      // Create order
      if (products.length > 0) {
        // Save the order
        const order = createOrder(products)
        await saveOrder($.getDataFile(ordersFile), targetSite, targetCountry, order)
        orders.push(order)

        console.log(`Finished processing order #${orders.length}`)
      }

      orderTries++
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
