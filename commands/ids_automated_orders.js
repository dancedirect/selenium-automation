const login = () => {
  
}

const run = async (argv) => {
  const { target_site: targetSite, target_country: targetCountry } = argv
  if (_.isEmpty(targetSite)) {
    throw new Error('"target_site" is required.')
  }

  siteConfig = getSiteConfig(targetSite, targetCountry)

  let driver = new Builder()
    .usingServer('http://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(capabilities)
    .build()

  try {
    await login(driver)

    await driver.quit()
  } catch (err) {
    await driver.quit()
    throw err
  }
}

exports.run = run