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

let mod

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

    mod = require(cmdPath)
    await mod.run(argv)
}

['SIGINT', 'SIGUSR1', 'SIGUSR2', 'uncaughtException'].forEach((signal) => {
    process.on(signal, () => {
        if (mod.onExit) {
            console.log(utils.logWarning('Executing the onExit callback'))
            mod.onExit()
                .then(() => {
                    process.exit(0)
                })
            }
    })
})

process.on('exit', (exitCode) => {
    console.log('Exiting command', exitCode)
})

main()
    .catch((err) => {
        console.error(utils.logError(err.stack))
    })
