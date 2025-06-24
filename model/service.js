// models/service.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PricingSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: String, required: true },
  description: { type: String, default: '' },
  features:    [String],
  isPopular:   { type: Boolean, default: false }
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
  serviceId: { 
    type: String, 
    default: uuidv4, 
    unique: true, 
    index: true 
  },
  name:      { type: String, required: true, unique: true },
  pricing:   [PricingSchema]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
