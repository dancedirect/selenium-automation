const {Builder, By} = require('selenium-webdriver')
const _ = require('lodash')
const config = require('../config')
const utils = require('../utils')

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

const landedInPage = (expectedPageTitle, pageTitle) => {
    expectedPageTitle = (expectedPageTitle || '').toLowerCase()
    pageTitle = (pageTitle || '').toLowerCase()

    if (pageTitle === expectedPageTitle) {
        return true
    }

    return pageTitle.indexOf(expectedPageTitle) > -1
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

    let baseUrl = homeUrl = `${protocol}:\\\\${targetSite}`
    if (httpAuth) {
        homeUrl = `${protocol}:\\\\${config.env.httpAuthUser}:${config.env.httpAuthPassword}@${targetSite}`
    }

    // Go to home page
    await driver.get(homeUrl)
    const loginLink = await driver.findElement(By.css('body > .page-wrapper > .page-header .authorization-link > a'))
    let title = await driver.getTitle()
    if (!landedInPage('Home', title)) {
        throw new Error('Home page landing failed.')
    }

    // Go to login page and login
    const loginUrl = await loginLink.getAttribute('href')
    await driver.navigate().to(loginUrl)
    title = await driver.getTitle()
    if (!landedInPage('Login', title)) {
        throw new Error('Login page landing failed.')
    }

    await driver.findElement(By.name('login[username]')).sendKeys(config.env.dd.accountEmail)
    await driver.findElement(By.name('login[password]')).sendKeys(config.env.dd.accountPassword)
    await driver.findElement(By.id('send2')).click()
    
    await driver.navigate().to(`${baseUrl}/customer/account/`)
    title = await driver.getTitle()
    if (!landedInPage('Dashboard', title)) {
        throw new Error('Login Failed.')
    }

    driver.quit()
}

exports.run = run
exports.onExit = onExit
