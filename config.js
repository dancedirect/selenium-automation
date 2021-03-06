const _ = require('lodash')

const ukAddress = {
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    company: 'DD',
    address: '45 Ermin Street',
    city: 'WYTHALL',
    region: '',
    postalCode: 'B47 4QX',
    country: 'GB',
    phoneNumber: '077 5164 4168',
}

const deAddress = {
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    company: 'DD',
    address: 'Fugger Strasse 17',
    city: 'Potsdam',
    region: 'Brandenburg',
    postalCode: '14432',
    country: 'DE',
    phoneNumber: '077 5164 4168',
}

const esAddress = {
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    company: 'DD',
    address: 'San Andrés 23',
    city: 'Alaraz',
    region: 'Salamanca',
    postalCode: '37312',
    country: 'ES',
    phoneNumber: '635 265 886',
}

const itAddress = {
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    company: 'DD',
    address: 'Piazzetta Concordia 90',
    city: 'Scipione',
    region: 'Parma',
    postalCode: '43039',
    country: 'IT',
    phoneNumber: '0317 6591470',
}

const frAddress = {
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    company: 'DD',
    address: '53  rue des Dunes',
    city: 'SAINT-MALO',
    region: '',
    postalCode: '35400',
    country: 'FR',
    phoneNumber: '02.27.81.91315',
}

const ccPayment = {
    type: 'Sagepay',
    cardType: 'MasterCard',
    card: '5404000000000001',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    month: '09',
    year: '2020',
    cvc: '256',
}

const paypalPayment = {
    type: 'Paypal',
    email: 'paypaltest@ids.co.uk',
    password: 'PPTestPassword!2013',
}

const getAccountLogin = (targetSite, targetCountry) => {
    let accountEmail = _.get(process.env, `${targetSite.toUpperCase()}_${targetCountry.toUpperCase()}_ACCOUNT_EMAIL`)
    if (!accountEmail) {
        accountEmail = _.get(process.env, `${targetSite.toUpperCase()}_ACCOUNT_EMAIL`)
    }

    let accountPassword = _.get(process.env, `${targetSite.toUpperCase()}_${targetCountry.toUpperCase()}_ACCOUNT_PASSWORD`)
    if (!accountPassword) {
        accountPassword = _.get(process.env, `${targetSite.toUpperCase()}_ACCOUNT_PASSWORD`)
    }

    return {
        accountEmail,
        accountPassword,
    }
}

const config = {
    environment: process.env.ENVIRONMENT,
    httpAuthUser: process.env.HTTP_AUTH_USER,
    httpAuthPassword: process.env.HTTP_AUTH_PASSWORD,
    httpAuthRequired: !_.isEmpty(process.env.HTTP_AUTH_USER) && !_.isEmpty(process.env.HTTP_AUTH_PASSWORD),
    browserstackUsername: process.env.BROWSERSTACK_USERNAME,
    browserstackAccessKey: process.env.BROWSERSTACK_ACCESS_KEY,
    browserstackServer: 'http://hub-cloud.browserstack.com/wd/hub',
    debug: parseInt(process.env.DEBUG_ENABLED) === 1,
    capabilities: {
        'browserName': 'Chrome',
        'browser_version': '76.0 beta',
        'os': 'OS X',
        'os_version': 'Mojave',
        'resolution': '1280x960',
        'browserstack.user': process.env.BROWSERSTACK_USERNAME,
        'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY,
        'name': 'Automated order',
    },
    billingAddress: {...ukAddress},
    shippingAddress: {...ukAddress},
    ccPayment,
    paypalPayment,
    dd: {
        prod: {
            uk: {
                url: 'https://www.dancedirect.com',
            },
            de: {
                url: 'https://www.dancedirect.de',
            },
            es: {
                url: 'https://www.dancedirect.es',
            },
            it: {
                url: 'https://www.dancedirect.it',
            },
            eu: {
                url: 'https://www.dancedirect.eu',
            },
        },
        uat: {
            uk: {
                url: 'https://ukdancedirectuat.gammapartners.com',
            },
            de: {
                url: 'https://dedancedirectuat.gammapartners.com',
            },
            es: {
                url: 'https://esdancedirectuat.gammapartners.com',
            },
            it: {
                url: 'https://itdancedirectuat.gammapartners.com',
            },
            eu: {
                url: 'https://roedancedirectuat.gammapartners.com',
            },
        },
        staging: {
            uk: {
                url: 'https://mcstaging.dancedirect.com',
            },
            de: {
                url: 'http://mcstaging.dancedirect.de',
            },
            es: {
                url: 'http://mcstaging.dancedirect.es',
            },
            it: {
                url: 'http://mcstaging.dancedirect.it',
            },
            eu: {
                url: 'http://mcstaging.dancedirect.eu',
            },
        },
    },
    ids: {
        prod: {
            uk: {
                url: 'http://mcprod.ids.co.uk',
            },
            de: {
                url: 'http://mcprod.ids.co.de',
            },
            es: {
                url: 'http://mcprod.ids.co.es',
            },
            fr: {
                url: 'http://mcprod.ids.co.fr',
            },
            it: {
                url: 'http://mcprod.ids.co.it',
            },
            au: {
                url: 'http://mcprod.idsaustralia.com',
            },
            eu: {
                url: 'http://mcprod.ids.co.eu',
            },
        },
        uat: {
            uk: {
                url: 'https://ukidsuat.gammapartners.com',
            },
            de: {
                url: 'https://deidsuat.gammapartners.com',
            },
            es: {
                url: 'https://esidsuat.gammapartners.com',
            },
            fr: {
                url: 'https://fridsuat.gammapartners.com',
            },
            it: {
                url: 'https://itidsuat.gammapartners.com',
            },
            au: {
                url: 'https://auidsuat.gammapartners.com',
            },
            eu: {
                url: 'https://roeidsuat.gammapartners.com',
            },
        },
        staging: {
            uk: {
                url: 'https://mcstaging.ids.co.uk',
            },
            de: {
                url: 'https://mcstaging.idsdance.de',
            },
            es: {
                url: 'https://mcstaging.idsdance.es',
            },
            fr: {
                url: 'https://mcstaging.idsdance.fr',
            },
            it: {
                url: 'https://mcstaging.idsdance.it',
            },
            au: {
                url: 'http://mcstaging.idsaustralia.com',
            },
            eu: {
                url: 'https://mcstaging.idsdance.eu',
            },
        },
    },
}

const getAddress = (targetCountry) => {
    let address
    switch(targetCountry) {
        case 'de':
            address = {...deAddress}
            break
        case 'es':
            address = {...esAddress}
            break
        case 'it':
            address = {...itAddress}
            break
        case 'fr':
            address = {...frAddress}
            break
        default:
            address = {...ukAddress}
            break
    }

    return address
}

const getSiteConfig = (targetSite, targetCountry) => {
    const siteConfig = _.get(config, `${targetSite}.${config.environment}.${targetCountry}`)
    if (!siteConfig) {
        throw new Error(`Site ${config.environment} ${targetSite}-${targetCountry} is not supported.`)
    }

    let address = getAddress(targetCountry)

    return {
        ...siteConfig,
        ...getAccountLogin(targetSite, targetCountry),
        billingAddress: {...address},
        shippingAddress: {...address},
    }
}

exports.env = config
exports.getAddress = getAddress
exports.getSiteConfig = getSiteConfig
