const { Builder, By, until } = require('selenium-webdriver')
const config = require('./config')
const clc = require('cli-color');

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
        await callback(array[index], index, array)
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

exports.scrollElementIntoView = async (driver, elem) => {
    await driver.executeScript("arguments[0].scrollIntoView()", elem);
    await driver.sleep(300);
};

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

exports.getRandomNumber = max => Math.floor(Math.random() * max)

exports.getRandomArrItem = arr => arr[exports.getRandomNumber(arr.length)]

exports.getUrlPath = url => url.replace(/^.*\/\/[^\/]+/, '')

exports.getNormalizedUrl = (baseUrl, url) => {
    if (url.indexOf('http') > 0) {
        return url
    }
    
    if (url[0] === '/') {
        url = url.substring(1)
    }

    return `${baseUrl}/${url}`
}
