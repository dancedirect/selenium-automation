const { By } = require('selenium-webdriver')
const $ = require('../utils')

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

const getRandomCategoryProductUrl = async (driver, baseUrl, categoryUrl) => {
  await driver.navigate().to($.getNormalizedUrl(baseUrl, categoryUrl))

  // Product list
  let productList
  try {
    await driver.findElement(By.id('amasty-shopby-product-list'))
  } catch(err) {
    return undefined
  }

  // Return if product list empty
  try {
    await productList.findElement('.message.info.empty')
    return undefined
  } catch(err) {
  }

  // Get the default page size
  const limiter = await driver.findElement(By.id('limiter'))
  const limiterOption = await $.selectedOption(limiter)
  let limiterOptionValue = 12
  if (limiterOption) {
    limiterOptionValue = await limiterOption.getAttribute('value')
  }

  // Get the total number of pages
  const toolBarAmount = await driver.findElement(By.id('toolbar-amount'))
  const toolBarAmountParts = await toolBarAmount.findElements(By.css('.toolbar-number'))
  let pageSize = parseInt(limiterOptionValue)
  let totalItems = 0

  if (toolBarAmountParts.length === 1) {
    totalItems = await toolBarAmountParts[0].getText()
  } else {
    pageSize = await toolBarAmountParts[1].getText()
    totalItems = await toolBarAmountParts[2].getText()
  }

  const totalPages = Math.ceil(totalItems / pageSize)
  const page = totalPages > 1 ? $.getRandomNumber(totalPages) : totalPages

  // Go to the new category url
  if (page > 1) {
    await driver.navigate().to($.getNormalizedUrl(baseUrl, `${categoryUrl}?p=${page}`))
    try {
      productList = await driver.findElement(By.id('amasty-shopby-product-list'))
    } catch(err) {
      return undefined
    }
  }

  // Select a random product url
  const products = await productList.findElements(By.css('.product-item'))
  const totalProducts = products.length
  if (totalProducts < 1) {
    return undefined
  }

  const product = $.getRandomArrItem(products)
  const productAnchor = await product.findElement(By.css('.product-item-photo'))
  const productUrl = await productAnchor.getAttribute('href')

  return productUrl
}

const getRandomProductVariant = async (driver, baseUrl, productUrl) => {
  await driver.navigate().to($.getNormalizedUrl(baseUrl, productUrl))

  // Wait until the form has been loaded
  const addToCartForm = await driver.wait(until.elementLocated(By.id('product_addtocart_form')), 30000, undefined, 1000)
  await $.scrollElementIntoView(driver, addToCartForm)
  
  // Find the product attribute selects and their options
  const productAttrSelects = await addToCartForm.findElements(By.css('.control.bulk-input'))
  const optionsByProductAttr = {}

  await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
    let productAttrName = await productAttrSelect.getAttribute('class')
    productAttrName = getProductAttrName(productAttrName)
    optionsByProductAttr[productAttrName] = []

    const options = await productAttrSelect.findElements(By.tagName('option'))
    await $.asyncForEach(options, async(option, i) => {
      if (i > 0) {
        let value = await option.getText()
        value = value.replace(/ *\([^)]*\) */g, '')
        optionsByProductAttr[productAttrName].push(value)
      }
    })
  })

  const product = {
    url: productUrl,
    qty: $.getRandomNumber(10)
  }

  const productAttrs = Object.keys(optionsByProductAttr)
  productAttrs.forEach((productAttr) => {
    product[productAttr] = $.getRandomArrItem(optionsByProductAttr[productAttr])
  })
  
  return product
}

exports.productAttrNameMap = productAttrNameMap
exports.getProductAttrName = getProductAttrName
exports.getProductStock = getProductStock
exports.getProductAttrOption = getProductAttrOption
exports.getRandomCategoryProductUrl = getRandomCategoryProductUrl
exports.getRandomProductVariant = getRandomProductVariant
