const {Builder, By, until} = require('selenium-webdriver')
const _ = require('lodash')
const config = {...require('../config')}
const $ = require('../utils')

// Input capabilities
const capabilities = {
 'browserName': 'Chrome',
 'browser_version': '76.0 beta',
 'os': 'OS X',
 'os_version': 'Mojave',
 'resolution': '1280x960',
 'browserstack.user': config.env.browserstackUsername,
 'browserstack.key': config.env.browserstackAccessKey,
 'name': 'Bstack-[Node] Sample Test'
}

const orders = () => [
    {
        shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            company: 'DD',
            address: '45  Ermin Street',
            city: 'WYTHALL',
            region: '',
            postalCode: 'B47 4QX',
            country: 'GB',
            phoneNumber: '077 5164 4168'
        },
        payment: {
            type: 'MasterCard',
            card: '5404000000000001',
            name: 'John Doe',
            month: '09',
            year: '2020',
            cvc: '256'
        },
        products: [
            {
                url: `${config.baseUrl}/sdbae26-so-danca-mens-professional-split-sole-canvas-upper-stretch-insert.html`,
                colorSwatchId: 93,
                colorId: 4,
                sizeSwatchId: 152,
                sizeId: 563,
                qty: 2
            },
            {
                url: `${config.baseUrl}/bl277m-bloch-pump-men-s-canvas-ballet-shoes.html`,
                colorSwatchId: 93,
                colorId: 4,
                sizeSwatchId: 152,
                sizeId: 393,
                qty: 2
            }
        ]
    }
]

const getSwatchElemId = (type, swatchId, colorId) => `option-label-${type}-${swatchId}-item-${colorId}`

const getCartItemCount = async(driver) => {
    try {
        const counter = await driver.findElement(By.css('.counter-number'))
        let counterNum = await counter.getText()
        return $.extractNumberFromText(counterNum)
    } catch (err) {
        return -1
    }
}

const getBaseUrl = (protocol, targetSite) => `${protocol}:\\\\${targetSite}`

/**
 * Login the user 
 */
const login = async(driver) => {
    const { httpAuth, protocol, targetSite, baseUrl } = config
    let homeUrl = baseUrl
    if (httpAuth) {
        homeUrl = `${protocol}:\\\\${config.env.httpAuthUser}:${config.env.httpAuthPassword}@${targetSite}`
    }

    // Go to home page
    await driver.get(homeUrl)
    const loginLink = await driver.findElement(By.css('body > .page-wrapper > .page-header .authorization-link > a'))
    let title = await driver.getTitle()
    if (!$.stringIncludes('Home', title)) {
        throw new Error('Home page landing failed.')
    }

    // Accept cookies
    try {
        const cookieAllow = await driver.wait(until.elementLocated(By.id('btn-cookie-allow')), 5000, undefined, 1000)
        await cookieAllow.click()
        console.log('Cookies accepted')
    } catch(err) {
        console.log('Cookies already accepted')
    }
    
    // Go to login page and login
    const loginUrl = await loginLink.getAttribute('href')
    await driver.navigate().to(loginUrl)
    title = await driver.getTitle()
    if (!$.stringIncludes('Login', title)) {
        throw new Error('Login page landing failed.')
    }

    await driver.findElement(By.name('login[username]')).sendKeys(config.env.dd.accountEmail)
    await driver.findElement(By.name('login[password]')).sendKeys(config.env.dd.accountPassword)
    await driver.findElement(By.id('send2')).click()
    
    await driver.navigate().to(`${baseUrl}/customer/account/`)
    title = await driver.getTitle()
    if (!$.stringIncludes('Dashboard', title)) {
        throw new Error('Login Failed.')
    }
}

/**
 * Logout the user
 */
const logout = async(driver) => {
    const { baseUrl } = config
    await driver.get(`${baseUrl}/customer/account/logout/`)
    await driver.wait(async() => {
        const title = await driver.getTitle()
        return $.stringIncludes('Home', title)
    }, 30000, undefined, 1000)
}

const checkout = async(driver, order) => {
    const { baseUrl } = config
    await driver.get(`${baseUrl}/checkout/`)

    // Wait for shipping section to load
    const shipping = await driver.wait(until.elementLocated(By.id('shipping')), 10000, undefined, 1000)
    
    await $.sleep(1000)

    // Wait for shipping methods to load
    let shippingMethods = await driver.wait(until.elementLocated(By.id('opc-shipping_method')), 30000, undefined, 1000)
    await driver.wait(async() => {
        try {
            const shippingMethodLoadedClassName = await shippingMethods.getAttribute('class')
            return shippingMethodLoadedClassName.indexOf('_block-content-loading') < 0
        } catch(err) {
            return false
        }
    }, 30000, undefined, 1000)

    // Display the new shipping address modal
    const addShippingAddress = await shipping.findElement(By.css('.action.action-show-popup'))
    await addShippingAddress.click()

    // Fill in the new shipping address form
    const { shippingAddress } = order
    const shippingAddressFormModal = await driver.wait(until.elementLocated(By.css('.modal-popup.modal-slide._inner-scroll._show')), 10000, undefined, 1000)
    const shippingAddressForm = await driver.wait(until.elementLocated(By.id('shipping-new-address-form')), 10000, undefined, 1000)

    const country = await shippingAddressForm.findElement(By.name('country_id'))
    await $.selectByVisibleText(country, shippingAddress.country)
    await shippingAddressForm.findElement(By.name('firstname')).clear()
    await shippingAddressForm.findElement(By.name('firstname')).sendKeys(shippingAddress.firstName)

    await shippingAddressForm.findElement(By.name('lastname')).clear()
    await shippingAddressForm.findElement(By.name('lastname')).sendKeys(shippingAddress.lastName)

    await shippingAddressForm.findElement(By.name('company')).clear()
    await shippingAddressForm.findElement(By.name('company')).sendKeys(shippingAddress.company)

    await shippingAddressForm.findElement(By.name('street[0]')).clear()
    await shippingAddressForm.findElement(By.name('street[0]')).sendKeys(shippingAddress.address)

    await shippingAddressForm.findElement(By.name('city')).clear()
    await shippingAddressForm.findElement(By.name('city')).sendKeys(shippingAddress.city)

    await shippingAddressForm.findElement(By.name('region')).clear()
    await shippingAddressForm.findElement(By.name('region')).sendKeys(shippingAddress.region)

    await shippingAddressForm.findElement(By.name('postcode')).clear()
    await shippingAddressForm.findElement(By.name('postcode')).sendKeys(shippingAddress.postalCode)

    await shippingAddressForm.findElement(By.name('telephone')).clear()
    await shippingAddressForm.findElement(By.name('telephone')).sendKeys(shippingAddress.phoneNumber)

    await shippingAddressForm.findElement(By.id('shipping-save-in-address-book')).click()

    // Submit the new shipping address form
    const saveShippingAddressBtn = await shippingAddressFormModal.findElement(By.css('.action-save-address'))
    await saveShippingAddressBtn.click()

    // Wait for the modal to close
    await $.sleep(1000)

    // Wait for shipping methods to load
    shippingMethods = await driver.wait(until.elementLocated(By.id('opc-shipping_method')), 30000, undefined, 1000)
    await driver.wait(async() => {
        try {
            const shippingMethodLoadedClassName = await shippingMethods.getAttribute('class')
            return shippingMethodLoadedClassName.indexOf('_block-content-loading') < 0
        } catch(err) {
            return false
        }
    }, 30000, undefined, 1000)

    // Make sure there are shipping methods available
    const shippingMethodsForm = await driver.wait(until.elementLocated(By.id('co-shipping-method-form')), 30000, undefined, 1000)
    await driver.wait(async() => {
        let shippingMethodsCount = 0
        try {
            const shippingMethodsAvailable = await shippingMethodsForm.findElements(By.css('.col.col-method'))
            shippingMethodsCount = shippingMethodsAvailable.length
        } catch(err) {
        }
        
        return shippingMethodsCount > 0
    }, 30000, undefined, 1000)

    // Go to the next step
    const buttons = await driver.findElement(By.id('shipping-method-buttons-container'))
    const next = await buttons.findElement(By.css('.continue'))
    await next.click()

    // Wait until the payment methods are visible
    await driver.wait(async(newDriver) => {
        const paymentMethods = await newDriver.findElement(By.id('checkout-payment-method-load'))

        try {
            await paymentMethods.findElement(By.css('.payment-methods'))
            return true
        } catch (err) {
            return false
        }
    }, 30000, undefined, 1000)

    // Select Sagepay
    const sagepayMethod = await driver.findElement(By.id('sagepaysuiteform'))
    await sagepayMethod.click()
    
    // Submit payment form
    const checkoutButton = await driver.findElement(By.css('.payment-method._active .action.checkout'))
    await checkoutButton.click()

    // Sagepay payment selection
    await driver.wait(async(newDriver) => {
        const title = await newDriver.getTitle()
        return $.stringIncludes('Sage Pay - Payment Selection', title)
    }, 30000, undefined, 1000)

    // Wait for the payment list to load
    const paymentMethods = await driver.wait(until.elementLocated(By.css('.payment-method-list')), 30000, undefined, 1000)
    const paymentMethodsList = await paymentMethods.findElements(By.css('.payment-method-list__item'))
    let paymentMethod
    
    // Click on the first payment method
    const { payment } = order

    await $.asyncForEach(paymentMethodsList, async(paymentMethodItem) => {
        let paymentMethodName = await paymentMethodItem.findElement(By.css('.payment-method__name'))
        paymentMethodName = await paymentMethodName.getText()
        if (paymentMethodName.toLowerCase() === payment.type.toLowerCase()) {
            paymentMethod = paymentMethodItem
        }
    })

    if (!paymentMethod) {
        throw new Error('Payment method not found.')
    }

    await paymentMethod.click()

    // Sagepay payment card details
    await driver.wait(async(newDriver) => {
        const title = await newDriver.getTitle()
        return $.stringIncludes('Sage Pay - Card Details', title)
    }, 30000, undefined, 1000)
}

/**
 * Adds a product to the cart
 */
const addProductToCart = async(driver, product) => {
    await driver.navigate().to(product.url)
    const title = await driver.getTitle()

    console.log('Product URL:', product.url)
    console.log('Product:', title)

    // Select the color
    const colorSwatchElemId = getSwatchElemId('color', product.colorSwatchId, product.colorId)
    const colorSwatch = await driver.wait(until.elementLocated(By.id(colorSwatchElemId)), 5000)
    const colorSwatchClassName = await colorSwatch.getAttribute('class')
    if (colorSwatchClassName.indexOf('selected') < 0) {
        await colorSwatch.click()
    }
    
    const selectedColorSwatch = await driver.wait(until.elementLocated(By.css('.swatch-attribute.color .selected')), 1000)
    const selectedColorSwatchID = await selectedColorSwatch.getAttribute('id')
    if (colorSwatchElemId !== selectedColorSwatchID) {
        throw new Error(`Product color "${product.colorId}" could not be selected.`)
    }

    console.log('Color ID:', product.colorId)

    // Select the size
    const sizeSwatchElemId = getSwatchElemId('size', product.sizeSwatchId, product.sizeId)
    const sizeSwatch = await driver.findElement(By.id(sizeSwatchElemId))
    const sizeSwatchClassName = await sizeSwatch.getAttribute('class')
    if (sizeSwatchClassName.indexOf('selected') < 0) {
        await sizeSwatch.click()
    }

    const selectedSizeSwatch = await driver.wait(until.elementLocated(By.css('.swatch-attribute.size .selected')), 1000)
    const selectedSizeSwatchID = await selectedSizeSwatch.getAttribute('id')
    if (sizeSwatchElemId !== selectedSizeSwatchID) {
        throw new Error(`Product size "${product.sizeId}" could not be selected.`)
    }

    console.log('Size ID:', product.sizeId)

    // Check the quantity
    let stockQty = await driver.findElement(By.id('stock-qty')).getText()
    stockQty = $.extractNumberFromText(stockQty)

    console.log('Stock QTY:', stockQty)

    // Add to cart
    let cartItemCount = await getCartItemCount(driver)
    console.log('Cart items:', cartItemCount)

    if (product.qty <= stockQty) {
        await driver.findElement(By.id('qty')).clear()
        await driver.findElement(By.id('qty')).sendKeys(`${product.qty}`)
        const qty = await driver.findElement(By.id('qty')).getAttribute('value')
        if (parseInt(qty) !== product.qty) {
            throw new Error('The product qty could not be set.')
        }

        const addToCart = await driver.findElement(By.id('product-addtocart-button'))
        const addToCartDisabled = await addToCart.getAttribute('disabled')
        if (addToCartDisabled === true) {
            throw new Error(`Add to cart button is disabled.`)
        }

        await addToCart.submit()

        await driver.wait(async(newDriver) => {
            const newCartItemCount = await getCartItemCount(newDriver)
            return newCartItemCount === cartItemCount + product.qty 
        }, 30000, undefined, 1000)
    }

    cartItemCount = await getCartItemCount(driver)
    console.log('Cart items:', cartItemCount)
}

/**
 * Empties the shopping cart
 */
const emptyCart = async(driver) => {
    const { baseUrl } = config

    await driver.get(`${baseUrl}/checkout/cart/`)

    let cart
    try {
        cart = await driver.findElement(By.id('shopping-cart-table'))
    } catch (err) {
        console.log('Cart is empty')
        return
    }

    let cartItemLines = await cart.findElements(By.css('.item-info'))
    let cartItemLineCount = cartItemLines.length
    const cartItemLineIterations = _.range(cartItemLineCount)

    console.log('Cart item lines:', cartItemLineCount)

    await $.asyncForEach(cartItemLineIterations, async() => {
        cart = await driver.findElement(By.id('shopping-cart-table'))
        cartItemLines = await cart.findElements(By.css('.item-info'))
        cartItemLine = cartItemLines[0]

        const deleteAction = await cartItemLine.findElement(By.css('.action.action-delete'))
        await deleteAction.click()

        await driver.wait(async(newDriver) => {
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
        console.log('Cart item lines:', cartItemLineCount)
    } catch (err) {
        console.log('Cart item lines:', 0)
    }
}

const run = async(argv) => {
    const {target_site: targetSite, protocol = 'https', http_auth: httpAuth} = argv
    if (_.isEmpty(targetSite)) {
        throw new Error(`"target_site" is required.`)
    }

    config.targetSite = targetSite
    config.protocol = protocol
    config.httpAuth = httpAuth
    config.baseUrl = getBaseUrl(protocol, targetSite)

    let driver = new Builder()
        .usingServer('http://hub-cloud.browserstack.com/wd/hub')
        .withCapabilities(capabilities)
        .build()

    try {
        await login(driver)

        // Empty cart
        await emptyCart(driver)

        // Get the order
        const order = orders()[0]
    
        // Add products to basket
        await $.asyncForEach(order.products, async(product) => {
            await addProductToCart(driver, product)
        })

        // Go to checkout
        await checkout(driver, order)

        // Logout
        await logout(driver)

        await driver.quit()
    } catch (err) {
        await driver.quit()
        throw err
    }
}

exports.run = run
