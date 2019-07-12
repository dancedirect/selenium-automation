const config = {
    httpAuthUser: process.env.HTTP_AUTH_USER,
    httpAuthPassword: process.env.HTTP_AUTH_PASSWORD,
    browserstackUsername: process.env.BROWSERSTACK_USERNAME,
    browserstackAccessKey: process.env.BROWSERSTACK_ACCESS_KEY,
    dd: {
        accountEmail: process.env.DD_ACCOUNT_EMAIL,
        accountPassword: process.env.DD_ACCOUNT_PASSWORD
    },
    ids: {
        accountEmail: process.env.IDS_ACCOUNT_EMAIL,
        accountPassword: process.env.IDS_ACCOUNT_PASSWORD
    }
}

exports.env = config
