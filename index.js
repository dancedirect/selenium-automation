require('dotenv').config()

const argv = require('yargs').argv
const fs = require('fs')
const {promisify} = require('util')
const _ = require('lodash')
const utils = require('./utils')

const fileExists = promisify(fs.access);

const {cmd, target_site: targetSite} = argv

let onExitCallback

const main = async() => {
    if (_.isEmpty(cmd)) {
        throw new Error('The "--cmd" argument is required.')
    }

    let cmdPath = `./commands/${cmd}.js`
    if (!_.isEmpty(targetSite)) {
        cmdPath = `./commands/${targetSite}_${cmd.replace(`${targetSite}_`, '')}.js`
    }

    try {
        await fileExists(cmdPath)
    } catch (err) {
        throw new Error(`"${cmd}" is an invalid --cmd value.`)
    }

    const mod = require(cmdPath)

    if (mod.onExit) {
        onExitCallback = mod.onExit
    }
    
    await mod.run(argv)
}

const exitHandler = (options, exitCode) => {
    if (options.cleanup) {
        console.log(utils.logInfo('clean'))
        if (onExitCallback) {
            console.log(utils.logWarning('Executing the onExit callback'))
            onExitCallback()
        }
    }

    if (exitCode || exitCode === 0) {
        console.log(utils.logAlert(exitCode))
    }

    if (options.exit) {
        process.exit()
    }
}

// Do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));

// Catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

// Catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit: true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit: true}));

// Catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

main()
    .catch((err) => {
        console.error(utils.logError(err.stack))
    })
