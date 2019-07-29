const { By } = require('selenium-webdriver')
const path = require('path')
const config = require('./config')
const clc = require('cli-color')

exports.getDataFile = filename => path.resolve(`./data/${filename}`)

exports.logInfo = (msg) => {
    return clc.green(msg)
}

exports.logWarning = (msg) => {
    return clc.yellow(msg)
}

exports.logError = (msg) => {
    return clc.red(msg)
}

exports.logAlert = (msg) => {
    return clc.red(msg)
}

exports.asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        const ret = await callback(array[index], index, array)
        if (ret === false) {
            break
        }
    }
}

exports.extractNumberFromText = (text) => {
    text = text.replace(/^\D+/g, '')
    let num = 0
    if (text !== '') {
        num = parseInt(text)
    }

    return num
}

exports.stringIncludes = (str, searchValue) => {
    str = (str || '').toLowerCase()
    searchValue = (searchValue || '').toLowerCase()

    if (searchValue === str) {
        return true
    }

    return searchValue.indexOf(str) > -1
}

exports.sleep = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

exports.selectByVisibleValue = async (select, valueDesired) => {
    const options = await select.findElements(By.tagName('option'))
    let optionFound
    await exports.asyncForEach(options, async (option) => {
        if (optionFound === undefined) {
            const value = await option.getAttribute('value')
            if (value === valueDesired) {
                optionFound = option
            }
        }
    })

    if (optionFound === undefined) {
        throw new Error(`Option "${valueDesired}" not found.`)
    }

    await optionFound.click()
}

exports.selectByVisibleText = async (select, textDesired) => {
    const options = await select.findElements(By.tagName('option'))
    let optionFound
    await exports.asyncForEach(options, async (option) => {
        if (optionFound === undefined) {
            const value = await option.getText()
            if (value.toLowerCase() === textDesired.toLowerCase()) {
                optionFound = option
            }
        }
    })

    if (optionFound === undefined) {
        throw new Error(`Option "${textDesired}" not found.`)
    }

    await optionFound.click()
}

exports.selectedOption = async (select) => {
    const options = await select.findElements(By.tagName('option'))
    let optionFound
    await exports.asyncForEach(options, async (option) => {
        if (optionFound === undefined) {
            const value = await option.getAttribute('selected')
            if (value === true || value === 'true') {
                optionFound = option
            }
        }
    })

    return optionFound
}

exports.scrollElementIntoView = async (driver, elem) => {
    await driver.executeScript("arguments[0].scrollIntoView()", elem)
    await driver.sleep(300)
}

exports.getCartItemCount = async (elem) => {
    try {
        let counterNum = await elem.getText()
        return exports.extractNumberFromText(counterNum)
    } catch (err) {
        return -1
    }
}

exports.log = (msg) => {
    if (config.env.debug) {
        console.log(msg)
    }
}

exports.getRandomNumber = (min, max) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

exports.getRandomArrItem = arr => arr[exports.getRandomNumber(0, arr.length - 1)]

exports.getUrlPath = url => url.replace(/^.*\/\/[^\/]+/, '')

exports.getNormalizedUrl = (baseUrl, url) => {
    if (url.indexOf('http') > -1) {
        return url
    }

    if (url[0] === '/') {
        url = url.substring(1)
    }

    return `${baseUrl}/${url}`
}

exports.getNameParts = (fullName) => {
    const firstName = fullName.split(' ').slice(0, -1).join(' ')
    const lastName = fullName.split(' ').slice(-1).join(' ')
    return {
        firstName,
        lastName,
    }
}

exports.isPageLoaded = async (driver, expectedUrl, exactMatch = false) => {
    await driver.wait(async (newDriver) => {
        const currentUrl = await newDriver.getCurrentUrl()
        if (exactMatch) {
            return exports.stripTrailingSlash(currentUrl) === exports.stripTrailingSlash(expectedUrl)
        }

        return currentUrl.indexOf(expectedUrl) > -1
    }, 30000, undefined, 1000)

    await exports.sleep(5000)
}

exports.stripTrailingSlash = str => str.endsWith('/') ? str.slice(0, -1) : str
