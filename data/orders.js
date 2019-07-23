const _ = require('lodash')
const config = require('../config')

const billingAddress = {
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

const shippingAddress = {
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

const ccPayment = {
  type: 'Sagepay',
  cardType: 'MasterCard',
  card: '5404000000000001',
  name: 'John Doe',
  month: '09',
  year: '2020',
  cvc: '256',
}

const paypalPayment = {
  type: 'Paypal',
  email: 'paypaltest@ids.co.uk',
  password: 'PPTestPassword!2013',
}

const orders = {
  dd: {
    uat: {
      uk: [
        {
          billingAddress: { ...billingAddress },
          shippingAddress: { ...shippingAddress },
          payment: { ...ccPayment },
          products: [
            {
              url: '/bl277m-bloch-pump-men-s-canvas-ballet-shoes.html',
              color: 'Black',
              size: 'EU 39 - UK 6 - US 9',
              qty: 1,
            },
            {
                url: '/bl277m-bloch-pump-men-s-canvas-ballet-shoes.html',
                color: 'Black',
                size: 'EU 39 - UK 6 - US 9',
                qty: 1,
            },
          ],
        },
      ],
    },
    staging: {
      uk: [
        {
          billingAddress: { ...billingAddress },
          shippingAddress: { ...shippingAddress },
          payment: { ...ccPayment },
          products: [
            {
              url: '/cz2038w-capezio-hanami-leather-ballet-shoe',
              color: 'Black',
              size: 'EU 39 - UK 6 - US 9',
              qty: 1,
            },
            {
              url: '/cz2038w-capezio-hanami-leather-ballet-shoe',
              color: 'Black',
              size: 'EU 40 - UK 6.5 - US 9.5',
              qty: 1,
            },
          ],
        },
      ],
    },
  },
  ids: {
    uat: {
      uk: [
        {
          billingAddress: { ...billingAddress },
          shippingAddress: { ...shippingAddress },
          payment: { ...ccPayment },
          products: [
            {
              url: '/rvzeus-roch-valley-zeus-mens-ballroom-leather-shoe-1-2-inch-heel.html',
              colour: 'Black',
              size: 'EU 45 - UK 10.5',
              shoeWidth: 'Regular',
              shoeHeight: '1.2 Inches Heel',
              qty: 1,
            },
            {
              url: '/bls0284-bloch-performa-stretch-canvas-split-sole-ballet-shoe.html',
              colour: 'Sand',
              size: 'EU 36 - UK 3',
              shoeWidth: 'C',
              qty: 1,
            },
            {
              url: '/bles0251l-bloch-elastosplit-x-canvas-width-c-ballet-shoe.html',
              colour: 'Pink',
              size: 'EU 37 - UK 4',
              qty: 1,
            },
          ],
        },
      ],
    },
  },
}

exports.getOrders = (targetSite, targetCountry) =>  _.get(orders, `${targetSite}.${config.env.environment}.${targetCountry}`) || []