const { By, until } = require('selenium-webdriver')
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

const getRandomProductPageNumber = async(driver, defaultPageSize=12) => {
  // Get the total number of pages
  const toolBarAmount = await driver.findElement(By.id('toolbar-amount'))
  const toolBarAmountParts = await toolBarAmount.findElements(By.css('.toolbar-number'))
  let pageSize = defaultPageSize
  let totalItems = 0

  if (toolBarAmountParts.length === 1) {
    totalItems = parseInt(await toolBarAmountParts[0].getText())
  } else {
    pageSize = parseInt(await toolBarAmountParts[1].getText())
    totalItems = parseInt(await toolBarAmountParts[2].getText())
  }

  const totalPages = Math.ceil(totalItems / pageSize)
  return totalPages > 1 ? $.getRandomNumber(1, totalPages) : totalPages
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
    let optionClicked = false
    await $.asyncForEach(options, async(option, i) => {
      let value = await option.getText()
      value = value.trim().replace(/ *\([^)]*\) */g, '')
      if (value != '') {
        optionsByProductAttr[productAttrName].push(value)
        if (!optionClicked) {
          optionClicked = true
          await option.click()
        }
      }
    })
  })

  let product
  let tries = 0
  while (!product && tries < 10) {
    const tmpProduct = {
      url: productUrl,
      qty: $.getRandomNumber(1, 10)
    }
  
    const productAttrs = Object.keys(optionsByProductAttr)
    productAttrs.forEach((productAttr) => {
      tmpProduct[productAttr] = $.getRandomArrItem(optionsByProductAttr[productAttr])
    })

    // Validate there is actually stock for this product 
    let stockQty = 0
    try {
      await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
        let productAttrName = await productAttrSelect.getAttribute('class')
        productAttrName = getProductAttrName(productAttrName)
      
        const productAttrOption = await getProductAttrOption(productAttrSelect.findElement(By.css('select')), tmpProduct[productAttrName])
        await productAttrOption.click()
  
        const productAttrValue = await productAttrOption.getText()
        stockQty = getProductStock(productAttrValue)
      })
    } catch(err) {
    }

    if (stockQty > 0) {
      product = {
        ...tmpProduct,
        qty: stockQty < tmpProduct.qty ? stockQty : tmpProduct.qty
      }
    }

    tries++
  }

  return product
}

exports.productAttrNameMap = productAttrNameMap
exports.getProductAttrName = getProductAttrName
exports.getProductStock = getProductStock
exports.getProductAttrOption = getProductAttrOption
exports.getRandomProductPageNumber = getRandomProductPageNumber
exports.getRandomProductVariant = getRandomProductVariant
