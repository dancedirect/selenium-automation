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

/**
 * Adds a product to the cart
 */
const addProductToCart = async (driver, baseUrl, product) => {
  await driver.navigate().to($.getNormalizedUrl(baseUrl, product.url))

  await $.sleep(5000)

  // Wait until the form has been loaded
  const addToCartForm = await driver.wait(until.elementLocated(By.id('product_addtocart_form')), 30000, undefined, 1000)
  await $.scrollElementIntoView(driver, addToCartForm)

  let qtyElem
  
  // Find the product attribute selects
  const productAttrSelects = await addToCartForm.findElements(By.css('.control.bulk-input'))
  if (productAttrSelects.length > 0) {
    let stockQty = 0
    await $.asyncForEach(productAttrSelects, async (productAttrSelect) => {
      let productAttrName = await productAttrSelect.getAttribute('class')
      productAttrName = getProductAttrName(productAttrName)

      const productAttrOption = await getProductAttrOption(productAttrSelect.findElement(By.css('select')), product[productAttrName])
      await productAttrOption.click()

      const productAttrValue = await productAttrOption.getText()
      stockQty = getProductStock(productAttrValue)
    })

    if (stockQty < 1) {
      throw new Error('Product not in stock.')
    }

    if (product.qty > stockQty) {
      product.qty = stockQty
    }

    qtyElem = await addToCartForm.findElement(By.id('qty_0'))
  } else {
    try {
      qtyElem = await addToCartForm.findElement(By.id('qty'))
    } catch (err) {
      throw new Error('Product not in stock.')
    }
  }

  // Add to cart
  const counter = await driver.findElement(By.css('.counter-number'))
  await $.scrollElementIntoView(driver, counter)
  
  let cartItemCount = await $.getCartItemCount(counter)

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

/**
 * Sagepay payment flow
 */
const sagepayPayment = async (driver, payment) => {
  // Make sure we landed in the card selection page
  await driver.wait(async (newDriver) => {
    const currentUrl = await newDriver.getCurrentUrl()
    return currentUrl.indexOf('/gateway/service/cardselection') > -1
  }, 30000, undefined, 1000)

  let pageWrapper = await driver.findElement(By.id('pageWrapper'))
  const forms = await pageWrapper.findElements(By.tagName('form'))

  let paymentMethodForm
  await $.asyncForEach(forms, async(form) => {
    if (!paymentMethodForm) {
      try {
        const paymentMethod = await form.findElement(By.name('cardselected'))
        const paymentMethodName = await paymentMethod.getAttribute('value')
        if (paymentMethodName.toLowerCase() === payment.cardType.toLowerCase()) {
          paymentMethodForm = form
        }
      } catch(err) {
      }
    }
  })

  const paymentMethodLink = await paymentMethodForm.findElement(By.tagName('a'))
  await $.scrollElementIntoView(driver, paymentMethodLink)
  await paymentMethodLink.click()

  // Make sure we landed in the card details page
  await driver.wait(async (newDriver) => {
    const currentUrl = await newDriver.getCurrentUrl()
    return currentUrl.indexOf('/gateway/service/carddetails') > -1
  }, 30000, undefined, 1000)

  pageWrapper = await driver.findElement(By.id('pageWrapper'))
  const ccForm = await pageWrapper.findElement(By.name('carddetails'))

  await ccForm.findElement(By.name('cardnumber')).clear()
  await ccForm.findElement(By.name('cardnumber')).sendKeys(payment.card)

  await ccForm.findElement(By.name('cardfirstnames')).clear()
  await ccForm.findElement(By.name('cardfirstnames')).sendKeys(payment.firstName)

  await ccForm.findElement(By.name('cardsurname')).clear()
  await ccForm.findElement(By.name('cardsurname')).sendKeys(payment.lastName)

  const expMonth = await ccForm.findElement(By.name('expirymonth'))
  await $.selectByVisibleText(expMonth, payment.month)

  const expYear = await ccForm.findElement(By.name('expiryyear'))
  await $.selectByVisibleText(expYear, payment.year)

  await ccForm.findElement(By.name('securitycode')).clear()
  await ccForm.findElement(By.name('securitycode')).sendKeys(payment.cvc)

  let proceedButton = await driver.findElement(By.id('proceedButton'))
  await $.scrollElementIntoView(driver, proceedButton)
  await proceedButton.click()

  // Wait until the confirmation page is loaded
  await driver.wait(async (newDriver) => {
    const currentUrl = await newDriver.getCurrentUrl()
    return currentUrl.indexOf('/gateway/service/cardconfirmation') > -1
  }, 30000, undefined, 1000)

  proceedButton = await driver.findElement(By.id('proceedButton'))
  await $.scrollElementIntoView(driver, proceedButton)
  await proceedButton.click()
}

const paymentCheckout = async(driver, payment) => {
  if (payment.type.toLowerCase() !== 'sagepay') {
    throw new Error(`"${payment.type}" not supported.`)
  }

  await sagepayPayment(driver, payment)
}

exports.productAttrNameMap = productAttrNameMap
exports.getProductAttrName = getProductAttrName
exports.getProductStock = getProductStock
exports.getProductAttrOption = getProductAttrOption
exports.getRandomProductPageNumber = getRandomProductPageNumber
exports.getRandomProductVariant = getRandomProductVariant
exports.addProductToCart = addProductToCart
exports.paymentCheckout = paymentCheckout
