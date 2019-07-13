const {Builder, By, until} = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
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

let driver

const onExit = () => {
    if (driver) {
        driver.quit()
    }
}

const getSwatchElemId = (type, swatchId, colorId) => `option-label-${type}-${swatchId}-item-${colorId}`

const getCounterNumber = async(driver) => {
    try {
        const counter = await driver.findElement(By.css('.counter-number'))
        let counterNum = await counter.getText()
        return $.extractNumberFromText(counterNum)
    } catch (err) {
        return -1
    }
}

const login = async(driver, httpAuth, protocol, targetSite) => {
    let baseUrl = homeUrl = `${protocol}:\\\\${targetSite}`
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
    let currCounterNumber = await getCounterNumber(driver)
    console.log('CURR Counter:', currCounterNumber)

    if (product.qty <= stockQty) {
        await driver.findElement(By.id('qty')).clear().sendKeys(`${product.qty}`)
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

        /* await driver.wait(async(nextDriver) => {
            let counterNum = await getCounterNumber(nextDriver)
            console.log(counterNum)
            return counterNum === currCounterNumber + product.qty 
        }, 60000, undefined, 10000) */
    }

    const finalCounterNumber = await getCounterNumber(driver)
    console.log('FINAL Counter:', finalCounterNumber)
}

const run = async(argv) => {
    const {target_site: targetSite, protocol = 'https', http_auth: httpAuth} = argv
    if (_.isEmpty(targetSite)) {
        throw new Error(`"target_site" is required.`)
    }

    driver = new Builder()
        .usingServer('http://hub-cloud.browserstack.com/wd/hub')
        .withCapabilities(capabilities)
        .build()

    await login(driver, httpAuth, protocol, targetSite)

    let baseUrl = `${protocol}:\\\\${targetSite}`

    // Add products to basket
    const products = [
        {
            url: `${baseUrl}/sdbae26-so-danca-mens-professional-split-sole-canvas-upper-stretch-insert.html`,
            colorSwatchId: 93,
            colorId: 4,
            sizeSwatchId: 152,
            sizeId: 563,
            qty: 2
        },
        {
            url: `${baseUrl}/bl277m-bloch-pump-men-s-canvas-ballet-shoes.html`,
            colorSwatchId: 93,
            colorId: 4,
            sizeSwatchId: 152,
            sizeId: 393,
            qty: 2
        }
    ]

    await $.asyncForEach(products, async(product) => {
        await addProductToCart(driver, product)
    })

    driver.quit()
}

exports.run = run
exports.onExit = onExit
