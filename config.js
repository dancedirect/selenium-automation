const _ = require('lodash')

const config = {
    environment: process.env.ENVIRONMENT,
    httpAuthUser: process.env.HTTP_AUTH_USER,
    httpAuthPassword: process.env.HTTP_AUTH_PASSWORD,
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
    dd: {
        prod: {
            uk: {
                url: 'https://www.dancedirect.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            de: {
                url: 'https://www.dancedirect.de',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            es: {
                url: 'https://www.dancedirect.es',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            it: {
                url: 'https://www.dancedirect.it',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            eu: {
                url: 'https://www.dancedirect.eu',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
        },
        uat: {
            uk: {
                url: 'https://ukdancedirectuat.gammapartners.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            de: {
                url: 'https://dedancedirectuat.gammapartners.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            es: {
                url: 'https://esdancedirectuat.gammapartners.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            it: {
                url: 'https://itdancedirectuat.gammapartners.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            eu: {
                url: 'https://roedancedirectuat.gammapartners.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
        },
        staging: {
            uk: {
                url: 'https://mcstaging.dancedirect.com',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            de: {
                url: 'http://mcstaging.dancedirect.de',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            es: {
                url: 'http://mcstaging.dancedirect.es',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            it: {
                url: 'http://mcstaging.dancedirect.it',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
            eu: {
                url: 'http://mcstaging.dancedirect.eu',
                accountEmail: process.env.DD_ACCOUNT_EMAIL,
                accountPassword: process.env.DD_ACCOUNT_PASSWORD,
            },
        },
    },
    ids: {
        prod: {
            uk: {
                url: 'http://mcprod.ids.co.uk',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
            de: {
                url: 'http://mcprod.ids.co.de',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
            es: {
                url: 'http://mcprod.ids.co.es',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
            fr: {
                url: 'http://mcprod.ids.co.fr',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
            it: {
                url: 'http://mcprod.ids.co.it',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
            au: {
                url: 'http://mcprod.idsaustralia.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true
            },
            eu: {
                url: 'http://mcprod.ids.co.eu',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
        },
        uat: {
            uk: {
                url: 'https://ukidsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            de: {
                url: 'https://deidsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            es: {
                url: 'https://esidsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            fr: {
                url: 'https://fridsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            it: {
                url: 'https://itidsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            au: {
                url: 'https://auidsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
            eu: {
                url: 'https://roeidsuat.gammapartners.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                httpAuth: true,
            },
        },
        staging: {
            uk: {
                url: 'https://mcstaging.ids.co.uk',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
            },
            de: {
                url: 'https://mcstaging.idsdance.de',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
            },
            es: {
                url: 'https://mcstaging.idsdance.es',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
            },
            fr: {
                url: 'https://mcstaging.idsdance.fr',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
            },
            it: {
                url: 'https://mcstaging.idsdance.it',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
            },
            au: {
                url: 'http://mcstaging.idsaustralia.com',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
                disabled: true,
            },
            eu: {
                url: 'https://mcstaging.idsdance.eu',
                accountEmail: process.env.IDS_ACCOUNT_EMAIL,
                accountPassword: process.env.IDS_ACCOUNT_PASSWORD,
            },
        },
    },
}

const getSiteConfig = (targetSite, targetCountry) => {
    const siteConfig = _.get(config, `${targetSite}.${config.environment}.${targetCountry}`)
    if (!siteConfig) {
        throw new Error(`Site ${targetSite}-${targetCountry} is not supported.`)
    }

    return siteConfig
}

exports.env = config
exports.getSiteConfig = getSiteConfig
