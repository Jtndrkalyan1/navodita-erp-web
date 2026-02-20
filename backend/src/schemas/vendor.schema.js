const Joi = require('joi');

const createVendorSchema = {
  body: Joi.object({
    vendor_type: Joi.string().valid('Business', 'Individual').default('Business'),
    display_name: Joi.string().required(),
    company_name: Joi.string().allow('', null),
    first_name: Joi.string().allow('', null),
    last_name: Joi.string().allow('', null),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().allow('', null),
    mobile: Joi.string().allow('', null),
    website: Joi.string().allow('', null),
    currency_code: Joi.string().default('INR'),
    exchange_rate: Joi.number().min(0).default(1),
    gstin: Joi.string().allow('', null),
    pan: Joi.string().allow('', null),
    payment_terms: Joi.string().allow('', null),
    opening_balance: Joi.number().default(0),
    place_of_supply: Joi.string().allow('', null),
    billing_attention: Joi.string().allow('', null),
    billing_address: Joi.string().allow('', null),
    billing_street: Joi.string().allow('', null),
    billing_city: Joi.string().allow('', null),
    billing_state: Joi.string().allow('', null),
    billing_country: Joi.string().allow('', null),
    billing_pincode: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    is_active: Joi.boolean().default(true),
  }),
};

const updateVendorSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    vendor_type: Joi.string().valid('Business', 'Individual'),
    display_name: Joi.string(),
    company_name: Joi.string().allow('', null),
    first_name: Joi.string().allow('', null),
    last_name: Joi.string().allow('', null),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().allow('', null),
    mobile: Joi.string().allow('', null),
    website: Joi.string().allow('', null),
    currency_code: Joi.string(),
    exchange_rate: Joi.number().min(0),
    gstin: Joi.string().allow('', null),
    pan: Joi.string().allow('', null),
    payment_terms: Joi.string().allow('', null),
    opening_balance: Joi.number(),
    place_of_supply: Joi.string().allow('', null),
    billing_attention: Joi.string().allow('', null),
    billing_address: Joi.string().allow('', null),
    billing_street: Joi.string().allow('', null),
    billing_city: Joi.string().allow('', null),
    billing_state: Joi.string().allow('', null),
    billing_country: Joi.string().allow('', null),
    billing_pincode: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    is_active: Joi.boolean(),
  }),
};

const deleteVendorSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

module.exports = {
  createVendorSchema,
  updateVendorSchema,
  deleteVendorSchema,
};
