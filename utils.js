const {Builder, By, until} = require('selenium-webdriver')
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

exports.asyncForEach = async(array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

exports.extractNumberFromText = (text) => {
    text = text.replace( /^\D+/g, '')
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

exports.selectByVisibleValue = async(select, valueDesired) => {
    const options = await select.findElements(By.tagName('option'))
    let optionFound
    await exports.asyncForEach(options, async(option) => {
        const value = await option.getAttribute('value')
        if (value === valueDesired) {
            optionFound = option
        }
    })

    if (!optionFound) {
        throw new Error(`Option "${valueDesired}" not found.`)
    }

    await optionFound.click()
}

exports.selectByVisibleText = async(select, textDesired) => {
    const options = await select.findElements(By.tagName('option'))
    let optionFound
    await exports.asyncForEach(options, async(option) => {
        const value = await option.getText()
        if (value.toLowerCase() === textDesired.toLowerCase()) {
            optionFound = option
        }
    })

    if (!optionFound) {
        throw new Error(`Option "${textDesired}" not found.`)
    }

    await optionFound.click()
}