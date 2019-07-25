const { Builder, By, until } = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const $ = require('../utils')
const { login, logout, getCategoryUrls, getRandomCategoryProductUrl, createOrder, saveOrders } = require('./automated_orders_common')
const { getRandomProductPageNumber, getRandomProductVariant } = require('./ids_common')

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  const siteConfig = config.getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, httpAuth, accountEmail, accountPassword } = siteConfig

  let driver = new Builder()
    .usingServer(config.env.browserstackServer)
    .withCapabilities(config.env.capabilities)
    .build()

  try {
    await login(driver, baseUrl, httpAuth, accountEmail, accountPassword)

    // Get the category urls 
    const categoryUrls = await getCategoryUrls(driver)

    const orders = []
    const maxOrders = 10
    const maxOrderTries = 10
    let orderTries = 0

    while (orders.length < maxOrders && orderTries < maxOrderTries) {
      const maxProducts = $.getRandomNumber(1, 15)
      const maxProductTries = 50
      let productTries = 0
      const products = []
  
      while (products.length < maxProducts && productTries < maxProductTries) {
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
        orders.push(createOrder(products))
      }

      orderTries++
    }

    if (orders.length > 0) {
      saveOrders(orders)
    }

    await logout(driver, baseUrl)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run