const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true },
  phone:     { type: String, required: true },
  subject:   { type: String, default: 'General Enquiry' },
  awbNumber: { type: String, default: '' },
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contact', ContactSchema);
