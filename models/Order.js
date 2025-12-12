const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  schoolName: String,
  className: String,
  regNumber: String,
  studentName: String,
  buyerPhone: String,
  buyerEmail: String,
  cart: Array,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", OrderSchema);
