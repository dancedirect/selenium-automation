const { By } = require('selenium-webdriver')
const _ = require('lodash')
const $ = require('../utils')

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

exports.getProductAttrName = getProductAttrName
exports.getProductAttrOption = getProductAttrOption
