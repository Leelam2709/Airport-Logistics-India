const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, phone, subject, awbNumber, message } = req.body;
  if (!name || !email || !phone || !message)
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });

  try {
    const contact = await Contact.create({ name, email, phone, subject, awbNumber, message });
    res.status(201).json({ success: true, message: 'Message received! We will contact you within 2 hours.', contact });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
