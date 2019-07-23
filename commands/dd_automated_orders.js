const { Builder, By, until } = require('selenium-webdriver')
const _ = require('lodash')
const { env, getSiteConfig } = require('../config')
const $ = require('../utils')
const { getOrders } = require('../data/orders')
const { login, logout, emptyCart } = require('./automated_orders_common')

// Application config
const config = {
  ...env
}

// Current site config
let siteConfig

// Input capabilities
const capabilities = {
  'browserName': 'Chrome',
  'browser_version': '76.0 beta',
  'os': 'OS X',
  'os_version': 'Mojave',
  'resolution': '1280x960',
  'browserstack.user': config.browserstackUsername,
  'browserstack.key': config.browserstackAccessKey,
  'name': 'Automated order'
}

/**
 * Utilities
 */
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
 * Places the order
 */
const checkout = async (driver, order) => {
  const { url: baseUrl } = siteConfig
  const { billingAddress, shippingAddress, payment } = order

  // Go to checkout page
  await driver.get(`${baseUrl}/checkout/`)

  // Wait for shipping section to load
  const shipping = await driver.wait(until.elementLocated(By.id('shipping')), 10000, undefined, 1000)

  await $.sleep(1000)

  // Wait for shipping methods to load
  let shippingMethods = await driver.wait(until.elementLocated(By.id('opc-shipping_method')), 30000, undefined, 1000)
  await driver.wait(async () => {
    try {
      const shippingMethodLoadedClassName = await shippingMethods.getAttribute('class')
      return shippingMethodLoadedClassName.indexOf('_block-content-loading') < 0
    } catch (err) {
      return false
    }
  }, 30000, undefined, 1000)

  // Does the user have a shipping address
  let hasShippingAddresses = false
  try {
    const shippingAddressItems = await shipping.findElements(By.css('.shipping-address-item'))
    hasShippingAddresses = shippingAddressItems.length > 0
  } catch (err) {
  }

  // No Shipping address found. Enter a new one
  if (!hasShippingAddresses) {
    // Fill in the new shipping address form
    const shippingAddressForm = await driver.wait(until.elementLocated(By.id('shipping-new-address-form')), 10000, undefined, 1000)
    await fillCheckoutAddressForm(driver, shippingAddressForm, shippingAddress)
  } else {
    // Display the new shipping address modal
    const addShippingAddress = await shipping.findElement(By.css('.action.action-show-popup'))
    await addShippingAddress.click()

    // Fill in the new shipping address form
    const shippingAddressFormModal = await driver.wait(until.elementLocated(By.css('.modal-popup.modal-slide._inner-scroll._show')), 10000, undefined, 1000)
    const shippingAddressForm = await driver.wait(until.elementLocated(By.id('shipping-new-address-form')), 10000, undefined, 1000)

    await fillCheckoutAddressForm(driver, shippingAddressForm, shippingAddress)

    // Submit the new shipping address form
    const saveShippingAddressBtn = await shippingAddressFormModal.findElement(By.css('.action-save-address'))
    await saveShippingAddressBtn.click()
  }

  await $.sleep(5000)

  // Wait for shipping methods to load
  shippingMethods = await driver.wait(until.elementLocated(By.id('opc-shipping_method')), 30000, undefined, 1000)
  await driver.wait(async () => {
    try {
      const shippingMethodLoadedClassName = await shippingMethods.getAttribute('class')
      return shippingMethodLoadedClassName.indexOf('_block-content-loading') < 0
    } catch (err) {
    }
  }, 30000, undefined, 1000)

  // Make sure there are shipping methods available
  const shippingMethodsForm = await driver.wait(until.elementLocated(By.id('co-shipping-method-form')), 30000, undefined, 1000)
  await driver.wait(async () => {
    let shippingMethodsCount = 0
    try {
      const shippingMethodsAvailable = await shippingMethodsForm.findElements(By.css('.col.col-method'))
      shippingMethodsCount = shippingMethodsAvailable.length
    } catch (err) {
    }

    return shippingMethodsCount > 0
  }, 30000, undefined, 1000)

  // Select the first shipping method
  const shippingMethodsAvailable = await shippingMethodsForm.findElements(By.css('.table-checkout-shipping-method > tbody .col.col-method'))
  const firstShippingMethod = shippingMethodsAvailable[0]
  await $.scrollElementIntoView(driver, firstShippingMethod)
  await firstShippingMethod.click()

  // Go to the next step
  const buttons = await driver.findElement(By.id('shipping-method-buttons-container'))
  const next = await buttons.findElement(By.css('.continue'))
  await next.click()

  // Wait until the payment methods are visible
  await driver.wait(async (newDriver) => {
    const paymentMethods = await newDriver.findElement(By.id('checkout-payment-method-load'))

    try {
      await paymentMethods.findElement(By.css('.payment-methods'))
      return true
    } catch (err) {
      return false
    }
  }, 30000, undefined, 1000)

  await $.sleep(5000)

  // Execute payment type flow
  if (payment.type.toLowerCase() === 'paypal') {
    await paypalCheckout(driver, payment)
  } else {
    await sagepayCheckout(driver, payment, billingAddress)
  }

  // Success page
  await driver.wait(async (newDriver) => {
    const title = await newDriver.getTitle()
    return $.stringIncludes('Success Page', title)
  }, 60000, undefined, 1000)
}

/**
 * Helper to complete the checkout address forms
 */
const fillCheckoutAddressForm = async (driver, addressForm, address) => {
  const country = await addressForm.findElement(By.name('country_id'))
  await $.selectByVisibleValue(country, address.country)
  await addressForm.findElement(By.name('firstname')).clear()
  await addressForm.findElement(By.name('firstname')).sendKeys(address.firstName)

  await addressForm.findElement(By.name('lastname')).clear()
  await addressForm.findElement(By.name('lastname')).sendKeys(address.lastName)

  await addressForm.findElement(By.name('company')).clear()
  await addressForm.findElement(By.name('company')).sendKeys(address.company)

  await addressForm.findElement(By.name('street[0]')).clear()
  await addressForm.findElement(By.name('street[0]')).sendKeys(address.address)

  await addressForm.findElement(By.name('city')).clear()
  await addressForm.findElement(By.name('city')).sendKeys(address.city)

  await addressForm.findElement(By.name('region')).clear()
  await addressForm.findElement(By.name('region')).sendKeys(address.region)

  await addressForm.findElement(By.name('postcode')).clear()
  await addressForm.findElement(By.name('postcode')).sendKeys(address.postalCode)

  await addressForm.findElement(By.name('telephone')).clear()
  await addressForm.findElement(By.name('telephone')).sendKeys(address.phoneNumber)

  try {
    const saveAddress = await addressForm.findElement(By.css('.field.choice > label'))
    await $.scrollElementIntoView(driver, saveAddress)
    await saveAddress.click();
  } catch (err) {
  }
}

/**
 * Paypal checkout flow
 */
const paypalCheckout = async (driver, payment) => {
  const paypalMethod = await driver.findElement(By.id('paypal_express'))
  await paypalMethod.click()

  const activePaymentMethod = await driver.findElement(By.css('.payment-method._active'))

  // Wait until checkout button is enabled
  let checkoutButton
  await driver.wait(async () => {
    checkoutButton = await activePaymentMethod.findElement(By.css('.action.checkout'))
    const checkoutButtonClassName = await checkoutButton.getAttribute('class')
    return checkoutButtonClassName.indexOf('disabled') < 1
  }, 30000, undefined, 1000)
}

/**
 * Sagepay checkout flow
 */
const sagepayCheckout = async (driver, payment, billingAddress) => {
  // Select Sagepay
  const sagepayMethod = await driver.findElement(By.id('sagepaysuiteform'))
  await sagepayMethod.click()

  // Submit payment form
  const activePaymentMethod = await driver.findElement(By.css('.payment-method._active'))
  if (billingAddress) {
    const enterBillingAddress = await activePaymentMethod.findElement(By.name('billing-address-same-as-shipping'))
    await enterBillingAddress.click()

    await $.sleep(2000)

    // Wait until addresses dropdown loads
    let billingAddressSelect
    try {
      billingAddressSelect = await activePaymentMethod.findElement(By.name('billing_address_id'))
    } catch (err) {
    }

    if (billingAddressSelect) {
      await $.selectByVisibleText(billingAddressSelect, 'New Address')
      await $.sleep(1000)
    }

    // Wait until the billing address form loads
    let billingAddressForm
    await driver.wait(async () => {
      billingAddressForm = await activePaymentMethod.findElement(By.css('.billing-address-form > form'))
      const billingAddressVisible = await billingAddressForm.isDisplayed()
      return billingAddressVisible
    }, 30000, undefined, 1000)

    // TODO: fix this check there are no multiple elements
    await fillCheckoutAddressForm(driver, billingAddressForm, billingAddress)

    // Submit the new billing address form
    let saveBillingAddress
    await driver.wait(async () => {
      saveBillingAddress = await activePaymentMethod.findElement(By.css('.payment-method-billing-address .action.action-update'))
      const saveBillingAddressVisible = await saveBillingAddress.isDisplayed()
      return saveBillingAddressVisible
    }, 30000, undefined, 1000)

    await saveBillingAddress.click()
  }

  // Wait until checkout button is enabled
  let checkoutButton
  await driver.wait(async () => {
    checkoutButton = await activePaymentMethod.findElement(By.css('.action.checkout'))
    const checkoutButtonClassName = await checkoutButton.getAttribute('class')
    return checkoutButtonClassName.indexOf('disabled') < 1
  }, 30000, undefined, 1000)

  await checkoutButton.click()

  // Sagepay payment selection
  await driver.wait(async (newDriver) => {
    const title = await newDriver.getTitle()
    return $.stringIncludes('Sage Pay - Payment Selection', title)
  }, 30000, undefined, 1000)

  // Wait for the payment list to load
  const paymentMethods = await driver.wait(until.elementLocated(By.css('.payment-method-list')), 30000, undefined, 1000)
  const paymentMethodsList = await paymentMethods.findElements(By.css('.payment-method-list__item'))
  let paymentMethod

  // Click on the first payment method
  await $.asyncForEach(paymentMethodsList, async (paymentMethodItem) => {
    let paymentMethodName = await paymentMethodItem.findElement(By.css('.payment-method__name'))
    paymentMethodName = await paymentMethodName.getText()
    if (paymentMethodName.toLowerCase() === payment.cardType.toLowerCase()) {
      paymentMethod = paymentMethodItem
    }
  })

  if (!paymentMethod) {
    throw new Error('Payment method not found.')
  }

  await paymentMethod.click()

  // Sagepay payment card details
  await driver.wait(async (newDriver) => {
    const title = await newDriver.getTitle()
    return $.stringIncludes('Sage Pay - Card Details', title)
  }, 30000, undefined, 1000)

  // Fill in and submit the credit card form
  const ccForm = await driver.wait(until.elementLocated(By.css('#main > div > form')), 10000, undefined, 1000)

  await ccForm.findElement(By.name('cardholder')).clear()
  await ccForm.findElement(By.name('cardholder')).sendKeys(payment.name)

  await ccForm.findElement(By.name('cardnumber')).clear()
  await ccForm.findElement(By.name('cardnumber')).sendKeys(payment.card)

  await ccForm.findElement(By.name('expirymonth')).clear()
  await ccForm.findElement(By.name('expirymonth')).sendKeys(payment.month)

  await ccForm.findElement(By.name('expiryyear')).clear()
  await ccForm.findElement(By.name('expiryyear')).sendKeys(payment.year)

  await ccForm.findElement(By.name('securitycode')).clear()
  await ccForm.findElement(By.name('securitycode')).sendKeys(payment.cvc)

  const submitCcForm = await ccForm.findElement(By.name('action'))
  await $.scrollElementIntoView(driver, submitCcForm)
  await submitCcForm.click()

  // Sagepay payment order summary
  await driver.wait(async (newDriver) => {
    const title = await newDriver.getTitle()
    return $.stringIncludes('Sage Pay - Order Summary', title)
  }, 30000, undefined, 1000)

  const ccConfirmationForm = await driver.wait(until.elementLocated(By.css('#main > form')), 10000, undefined, 1000)

  const submitCcConfirmationForm = await ccConfirmationForm.findElement(By.name('action'))
  await $.scrollElementIntoView(driver, submitCcConfirmationForm)
  await submitCcConfirmationForm.click()
}

/**
 * Adds a product to the cart
 */
const addProductToCart = async (driver, product) => {
  const { url: baseUrl } = siteConfig

  await driver.navigate().to(`${baseUrl}${product.url}`)

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
  
const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  siteConfig = getSiteConfig(targetSite, targetCountry)
  const { url: baseUrl, httpAuth, accountEmail, accountPassword } = siteConfig

  const orders = getOrders(targetSite, targetCountry)
  if (orders.length < 1) {
    throw new Error(`Site ${targetSite}-${targetCountry} doesn't have any orders to process.`)
  }

  let driver = new Builder()
    .usingServer('http://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(capabilities)
    .build()

  try {
    await login(driver, baseUrl, httpAuth, accountEmail, accountPassword)

    // Empty cart
    await emptyCart(driver, baseUrl)

    // Get the order
    const order = orders[0]

    // Add products to basket
    await $.asyncForEach(order.products, async (product) => {
      await addProductToCart(driver, product)
    })

    // Go to checkout
    await checkout(driver, order)

    // Logout
    await logout(driver, baseUrl)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run
