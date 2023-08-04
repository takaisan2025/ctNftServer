const Joi = require("joi");

const zksyncOrderSchema = Joi.object({
  accountId: Joi.number().integer().required(),
  recipient: Joi.string().required(),
  nonce: Joi.number().integer().required(),
  amount: Joi.string().required(),
  tokenSell: Joi.number().integer().required(),
  tokenBuy: Joi.number().integer().required(),
  validFrom: Joi.number().required(),
  validUntil: Joi.number()
    .min((Date.now() / 1000) | 0)
    .max(2000000000)
    .required(),
  ratio: Joi.array().items(Joi.string()).length(2).required(),
  signature: Joi.object().required().keys({
    pubKey: Joi.string().required(),
    signature: Joi.string().required(),
  }),
  ethSignature: Joi.any(),
});

const StarkNetSchema = Joi.object({
  message_prefix: Joi.string().required(),
  domain_prefix: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().required(),
    chain_id: Joi.string().required(),
  }),
  sender: Joi.string(),
  order: Joi.object({
    base_asset: Joi.string().required(),
    quote_asset: Joi.string().required(),
    side: Joi.string().required(),
    base_quantity: Joi.string().required(),
    price: Joi.object({
      numerator: Joi.string().required(),
      denominator: Joi.string().required(),
    }),
    expiration: Joi.string().required(),
  }),
  sig_r: Joi.string(),
  sig_s: Joi.string(),
});

const now = (Date.now() / 1000) | 0;
const EVMOrderSchema = Joi.object({
  user: Joi.string().required().messages({
    "string.base": `"user" should be a type of 'string'`,
    "string.hex": `"user" should be a hex string`,
    "any.required": `"user" is a required field`,
  }),
  sellToken: Joi.string().required().messages({
    "string.base": `"sellToken" should be a type of 'string'`,
    "string.hex": `"sellToken" should be a hex string`,
    "any.required": `"sellToken" is a required field`,
  }),
  buyToken: Joi.string().required().messages({
    "string.base": `"buyToken" should be a type of 'string'`,
    "string.hex": `"buyToken" should be a hex string`,
    "any.required": `"buyToken" is a required field`,
  }),
  sellAmount: Joi.string().required().messages({
    "string.base": `"sellAmount" should be a type of 'string'`,
    "any.required": `"sellAmount" is a required field`,
  }),
  buyAmount: Joi.string().required().messages({
    "string.base": `"buyAmount" should be a type of 'string'`,
    "any.required": `"buyAmount" is a required field`,
  }),
  expirationTimeSeconds: Joi.number()
    .greater(now)
    .less(now * 2)
    .required()
    .messages({
      "number.base": `"expirationTimeSeconds" should be a type of 'integer'`,
      "any.required": `"expirationTimeSeconds" is a required field`,
    }),
  signature: Joi.string().required().messages({
    "string.base": `"signature" should be a type of 'string'`,
    "any.required": `"signature" is a required field`,
  }),
});

const passwordSchema = Joi.object({
  password: Joi.string().required().messages({
    "string.base": `"password" should be a type of 'string'`,
    "string.hex": `"password" should be a hex string`,
    "any.required": `"password" is a required field`,
  }),
});
module.exports = {
  zksyncOrderSchema,
  StarkNetSchema,
  EVMOrderSchema,
  passwordSchema,
};
