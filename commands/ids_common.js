const { By } = require('selenium-webdriver')
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
  return totalPages > 1 ? $.getRandomNumber(totalPages) : totalPages
}

exports.productAttrNameMap = productAttrNameMap
exports.getProductAttrName = getProductAttrName
exports.getProductStock = getProductStock
exports.getProductAttrOption = getProductAttrOption
exports.getRandomProductPageNumber = getRandomProductPageNumber
