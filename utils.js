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