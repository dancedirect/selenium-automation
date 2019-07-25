const fs = require('fs');
const { By, until } = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const $ = require('../utils')

/**
 * Executes the login flow.
 */
const login = async (driver, baseUrl, httpAuth, accountEmail, accountPassword) => {
  let homeUrl = baseUrl
  if (httpAuth) {
    homeUrl = homeUrl.replace('://', `://${config.env.httpAuthUser}:${config.env.httpAuthPassword}@`)
  }

  // Go to home page
  await driver.get(homeUrl)
  let title = await driver.getTitle()
  if (!$.stringIncludes('Home', title)) {
    throw new Error('Home page landing failed.')
  }

  // Accept cookies
  try {
    const cookieAllow = await driver.wait(until.elementLocated(By.id('btn-cookie-allow')), 5000, undefined, 1000)
    await $.scrollElementIntoView(driver, cookieAllow)
    await cookieAllow.click()
  } catch (err) {
  }

  // Go to login page and login
  const loginLink = await driver.findElement(By.css('body > .page-wrapper > .page-header > .header  .authorization-link > a'))
  const loginUrl = await loginLink.getAttribute('href')
  await driver.navigate().to(loginUrl)
  title = await driver.getTitle()
  if (!$.stringIncludes('Login', title)) {
    throw new Error('Login page landing failed.')
  }

  await driver.findElement(By.name('login[username]')).sendKeys(accountEmail)
  await driver.findElement(By.name('login[password]')).sendKeys(accountPassword)
  await driver.findElement(By.id('send2')).click()

  await driver.navigate().to(`${baseUrl}/customer/account/`)
  title = await driver.getTitle()
  if (!$.stringIncludes('Dashboard', title)) {
    throw new Error('Login Failed.')
  }
}

/**
 * Executes the Logout flow.
 */
const logout = async (driver, baseUrl) => {
  await driver.get(`${baseUrl}/customer/account/logout/`)
  await driver.wait(async () => {
    const title = await driver.getTitle()
    return $.stringIncludes('Home', title)
  }, 30000, undefined, 1000)
}

/**
 * Empties the shopping cart.
 */
const emptyCart = async (driver, baseUrl) => {
  await driver.get(`${baseUrl}/checkout/cart/`)

  let cart
  try {
    cart = await driver.findElement(By.id('shopping-cart-table'))
  } catch (err) {
    return
  }

  // Wait for the shipping info to load
  await driver.wait(until.elementLocated(By.id('shipping-zip-form')), 30000, undefined, 1000)

  // Wait until the shipping form has loaded
  await $.sleep(5000)
  await driver.wait(until.elementLocated(By.id('co-shipping-method-form')), 30000, undefined, 1000)
  await driver.wait(async (newDriver) => {
    const shippingForm = await newDriver.findElement(By.id('co-shipping-method-form'))
    const shippingFormClass = await shippingForm.getAttribute('class')
    return shippingFormClass.indexOf('_block-content-loading') < 0
  }, 30000, undefined, 10000)

  // Wait until the cart total have loaded
  await driver.wait(until.elementLocated(By.id('cart-totals')), 30000, undefined, 1000)
  await driver.wait(async (newDriver) => {
    const cartTotals = await newDriver.findElement(By.id('cart-totals'))
    try {
      const loadingContent = await cartTotals.findElement(By.css('._block-content-loading'))
      return loadingContent.length < 1
    } catch (err) {
      return true
    }
  }, 30000, undefined, 10000)

  // Get the cart item lines
  let cartItemLines = await cart.findElements(By.css('.item-info'))
  let cartItemLineCount = cartItemLines.length
  const cartItemLineIterations = _.range(cartItemLineCount)

  await $.asyncForEach(cartItemLineIterations, async () => {
    cart = await driver.findElement(By.id('shopping-cart-table'))
    cartItemLines = await cart.findElements(By.css('.item-info'))
    cartItemLine = cartItemLines[0]

    const deleteAction = await cartItemLine.findElement(By.css('.action.action-delete'))
    await $.scrollElementIntoView(driver, deleteAction)
    await deleteAction.click()

    await driver.wait(async (newDriver) => {
      try {
        await newDriver.findElement(By.css('.cart-empty'))
        return true
      } catch (err) {
      }

      try {
        const newCart = await newDriver.findElement(By.id('shopping-cart-table'))
        const newCartItemLines = await newCart.findElements(By.css('.item-info'))
        if (newCartItemLines.length === cartItemLineCount - 1) {
          cartItemLineCount--
          return true
        }
      } catch (err) {
      }

      return false
    }, 30000, undefined, 1000)
  })

  try {
    cart = await driver.findElement(By.id('shopping-cart-table'))
    cartItemLines = await cart.findElements(By.css('.item-info'))
    cartItemLineCount = cartItemLines.length
  } catch (err) {
  }
}

/**
 * Places the order
 */
const checkout = async (driver, baseUrl, order) => {
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
 * Returns all the category urls found in the main menu.
 */
const getCategoryUrls = async (driver) => {
  const mainMenu = await driver.findElement(By.id('megamenu'))
  const menuTabs = await mainMenu.findElements(By.css('.tab-contents > .tab'))

  const categoryUrls = []

  await $.asyncForEach(menuTabs, async (menuTab) => {
    const subCategoryColumns = await menuTab.findElements(By.css('.tab-inner > .menu-item > .column'))
    await $.asyncForEach(subCategoryColumns, async (subCategoryColumn) => {
      const subCategoryItems = await subCategoryColumn.findElements(By.css('.column-items > li > a'))
      await $.asyncForEach(subCategoryItems, async (subCategoryItem) => {
        const url  = await subCategoryItem.getAttribute('href')
        categoryUrls.push(url)
      })
    })
  })

  return categoryUrls
}

const getRandomCategoryProductUrl = async (driver, baseUrl, categoryUrl, getRandomProductPageNumber) => {
  await driver.navigate().to($.getNormalizedUrl(baseUrl, categoryUrl))

  // Product list
  let productList
  try {
    productList = await driver.findElement(By.id('amasty-shopby-product-list'))
  } catch(err) {
    return undefined
  }

  // Return if product list empty
  try {
    await productList.findElement(By.css('.message.info.empty'))
    return undefined
  } catch(err) {
  }

  // Get the default page size
  const limiter = await driver.findElement(By.id('limiter'))
  const limiterOption = await $.selectedOption(limiter)
  let defaultPageSize = 12
  if (limiterOption) {
    defaultPageSize = parseInt(await limiterOption.getAttribute('value'))
  }

  const page = await getRandomProductPageNumber(driver, defaultPageSize)

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

const createOrder = (products) => {
  const order = {
    billingAddress: {...config.env.billingAddress},
    shippingAddress: {...config.env.shippingAddress},
    payment: {...config.env.ccPayment},
    products: [...products],
  }

  return order
}

const saveOrders = (orders, targetSite, targetCountry) => {
  let rawData = ''
  try {
    rawData = fs.readFileSync('orders.json')
  } catch (err) {
  }

  let data = {}
  if (!_.isEmpty(rawData)) {
    data = JSON.parse(rawData);
  }

  data[targetSite][config.env.environment][targetCountry] = [...orders]
  fs.writeFileSync('orders.json', JSON.stringify(data));
}

exports.login = login
exports.logout = logout
exports.emptyCart = emptyCart
exports.checkout = checkout
exports.getCategoryUrls = getCategoryUrls
exports.getRandomCategoryProductUrl = getRandomCategoryProductUrl
exports.createOrder = createOrder
exports.saveOrders = saveOrders
