const { By } = require('selenium-webdriver')
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

exports.getProductAttrName = getProductAttrName
exports.getProductAttrOption = getProductAttrOption
exports.addProductToCart = addProductToCart
