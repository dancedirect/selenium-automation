const path = require('path')
require('dotenv').config({
    path: path.resolve(`./.env-${process.env.ENVIRONMENT || 'uat'}`)
})

const argv = require('yargs').argv
const fs = require('fs')
const {promisify} = require('util')
const _ = require('lodash')
const utils = require('./utils')

const fileExists = promisify(fs.access);

const {cmd} = argv

const main = async() => {
    if (_.isEmpty(cmd)) {
        throw new Error('The "--cmd" argument is required.')
    }

    let cmdPath = `./commands/${cmd}.js`

    try {
        await fileExists(cmdPath)
    } catch (err) {
        throw new Error(`"${cmd}" is an invalid --cmd value.`)
    }

    const mod = require(cmdPath)

    await mod.run(argv)
}

const exitHandler = (options, exitCode) => {
    if (options.cleanup) {
        console.log(utils.logInfo('cleaning up'))
    }

    if (exitCode || exitCode === 0) {
        console.log(utils.logAlert(exitCode))
    }

    if (options.exit) {
        process.exit()
    }
}

// Do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}))

// Catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}))

// Catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit: true}))
process.on('SIGUSR2', exitHandler.bind(null, {exit: true}))

// Catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}))

main()
    .catch((err) => {
        console.error(utils.logError(err.stack))
    })
