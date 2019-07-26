const { By, until } = require('selenium-webdriver')
const _ = require('lodash')
const $ = require('../utils')

const getProductAttrName = (name) => _.camelCase(name.replace('swatch-attribute ', '').replace(' ', ''))

const getProductAttrOption = async(select, textDesired) => {
  const options = await select.findElements(By.css('.swatch-option'))
  let optionFound
  await $.asyncForEach(options, async(option) => {
    if (optionFound === undefined) {
      let value = await option.getAttribute('option-label')
      if (value.toLowerCase() === textDesired.toLowerCase()) {
        optionFound = option
      }
    }
  })

  if (optionFound === undefined) {
    throw new Error(`Option "${textDesired}" not found.`)
  }

  return optionFound
}

const getRandomProductPageNumber = async(driver, pageSize) => {
    // Get the total number of items
    let totalItems = await driver.findElement(By.css('body > .page-wrapper > .category-header .size'))
    totalItems = await totalItems.getText()
    totalItems = $.extractNumberFromText(totalItems)
  
    const totalPages = Math.ceil(totalItems / pageSize)
    return totalPages > 1 ? $.getRandomNumber(1, totalPages) : totalPages
}

/**
 * Adds a product to the cart
 */
const addProductToCart = async (driver, baseUrl, product) => {
  await driver.navigate().to($.getNormalizedUrl(baseUrl, product.url))

  // Wait until the form has been loaded
  const addToCartForm = await driver.wait(until.elementLocated(By.id('product_addtocart_form')), 30000, undefined, 1000)
  await $.scrollElementIntoView(driver, addToCartForm)

  // Find the product attribute selects
  const productAttrSelects = await addToCartForm.findElements(By.css('.swatch-attribute'))

  await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
    let productAttrName = await productAttrSelect.getAttribute('class')
    productAttrName = getProductAttrName(productAttrName)

    const productAttrOption = await getProductAttrOption(productAttrSelect, product[productAttrName])
    const productAttrOptionClassName = await productAttrOption.getAttribute('class')
    if (productAttrOptionClassName.indexOf('selected') < 0) {
      await $.scrollElementIntoView(driver, productAttrOption)
      await productAttrOption.click()
    }
  })

  // Check the quantity
  let stockQty = await driver.findElement(By.id('stock-qty')).getText()
  stockQty = $.extractNumberFromText(stockQty)

  // Add to cart
  const counter = await driver.findElement(By.css('.counter-number'))
  await $.scrollElementIntoView(driver, counter)

  let cartItemCount = await $.getCartItemCount(counter)

  if (product.qty <= stockQty) {
    const qtyElem = await addToCartForm.findElement(By.id('qty'))

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

const getRandomProductVariant = async (driver, baseUrl, productUrl) => {
  await driver.navigate().to($.getNormalizedUrl(baseUrl, productUrl))

  // Wait until the form has been loaded
  const addToCartForm = await driver.wait(until.elementLocated(By.id('product_addtocart_form')), 30000, undefined, 1000)
  const isFormDisplay = await addToCartForm.isDisplayed()
  if (!isFormDisplay) {
    return undefined
  }

  await $.scrollElementIntoView(driver, addToCartForm)
  
  // Find the product attribute selects and their options
  const productAttrSelects = await addToCartForm.findElements(By.css('.swatch-attribute'))
  const optionsByProductAttr = {}

  await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
    let productAttrName = await productAttrSelect.getAttribute('class')
    productAttrName = getProductAttrName(productAttrName)
    optionsByProductAttr[productAttrName] = []

    // Get all the options
    const options = await productAttrSelect.findElements(By.css('.swatch-option'))
    await $.asyncForEach(options, async(option) => {
      let value = await option.getAttribute('option-label')
      optionsByProductAttr[productAttrName].push(value)
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
    let isDisabled = false
  
    try {
      await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
        if (!isDisabled) {
          let productAttrName = await productAttrSelect.getAttribute('class')
          productAttrName = getProductAttrName(productAttrName)
        
          const option = await getProductAttrOption(productAttrSelect, tmpProduct[productAttrName])
          const optionClassName = await productAttrOption.getAttribute('class') 
          if (optionClassName.indexOf('disabled') > -1) {
            isDisabled = true
            stockQty = 0
          } else {
            if (optionClassName.indexOf('selected') < 0) {
              await $.scrollElementIntoView(driver, option)
              await option.click()
            }
          }
        }
      })
    } catch(err) {
    }

    if (isDisabled) {
      return undefined
    }

    stockQty = await driver.findElement(By.id('stock-qty')).getText()
    stockQty = $.extractNumberFromText(stockQty)

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

exports.getProductAttrName = getProductAttrName
exports.getProductAttrOption = getProductAttrOption
exports.addProductToCart = addProductToCart
exports.getRandomProductPageNumber = getRandomProductPageNumber
exports.getRandomProductVariant = getRandomProductVariant
