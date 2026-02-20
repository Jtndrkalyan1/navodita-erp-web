const Joi = require('joi');

const billItemSchema = Joi.object({
  item_id: Joi.string().uuid().allow(null),
  account_id: Joi.string().uuid().allow(null),
  item_name: Joi.string().required(),
  description: Joi.string().allow('', null),
  hsn_code: Joi.string().allow('', null),
  quantity: Joi.number().min(0).required(),
  unit: Joi.string().allow('', null),
  rate: Joi.number().min(0).required(),
  discount_percent: Joi.number().min(0).max(100).default(0),
  discount_amount: Joi.number().min(0).default(0),
  gst_rate: Joi.number().min(0).max(100).default(0),
  igst_amount: Joi.number().min(0).default(0),
  cgst_amount: Joi.number().min(0).default(0),
  sgst_amount: Joi.number().min(0).default(0),
  amount: Joi.number().min(0).required(),
  sort_order: Joi.number().integer().min(0).default(0),
});

const createBillSchema = {
  body: Joi.object({
    vendor_id: Joi.string().uuid().required(),
    bill_number: Joi.string().allow('', null),
    bill_date: Joi.date().required(),
    due_date: Joi.date().allow(null),
    reference_number: Joi.string().allow('', null),
    payment_terms: Joi.string().allow('', null),
    currency_code: Joi.string().default('INR'),
    exchange_rate: Joi.number().min(0).default(1),
    place_of_supply: Joi.string().allow('', null),
    sub_total: Joi.number().min(0).default(0),
    discount_amount: Joi.number().min(0).default(0),
    igst_amount: Joi.number().min(0).default(0),
    cgst_amount: Joi.number().min(0).default(0),
    sgst_amount: Joi.number().min(0).default(0),
    total_tax: Joi.number().min(0).default(0),
    tds_amount: Joi.number().min(0).default(0),
    total_amount: Joi.number().min(0).required(),
    amount_paid: Joi.number().min(0).default(0),
    balance_due: Joi.number().default(0),
    status: Joi.string().valid('Pending', 'Partial', 'Paid').default('Pending'),
    notes: Joi.string().allow('', null),
    items: Joi.array().items(billItemSchema).min(0),
  }),
};

const updateBillSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    vendor_id: Joi.string().uuid(),
    bill_number: Joi.string().allow('', null),
    bill_date: Joi.date(),
    due_date: Joi.date().allow(null),
    reference_number: Joi.string().allow('', null),
    payment_terms: Joi.string().allow('', null),
    currency_code: Joi.string(),
    exchange_rate: Joi.number().min(0),
    place_of_supply: Joi.string().allow('', null),
    sub_total: Joi.number().min(0),
    discount_amount: Joi.number().min(0),
    igst_amount: Joi.number().min(0),
    cgst_amount: Joi.number().min(0),
    sgst_amount: Joi.number().min(0),
    total_tax: Joi.number().min(0),
    tds_amount: Joi.number().min(0),
    total_amount: Joi.number().min(0),
    amount_paid: Joi.number().min(0),
    balance_due: Joi.number(),
    status: Joi.string().valid('Pending', 'Partial', 'Paid'),
    notes: Joi.string().allow('', null),
    items: Joi.array().items(billItemSchema).min(0),
  }),
};

const deleteBillSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

module.exports = {
  createBillSchema,
  updateBillSchema,
  deleteBillSchema,
};
