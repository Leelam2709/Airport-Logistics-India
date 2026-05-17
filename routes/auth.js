const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// ── POST /api/auth/register ───────────────────────────────────────
router.post('/register', async (req, res) => {
  console.log('📝 Register attempt:', req.body.email);
  const { name, email, phone, password, accountType } = req.body;

  if (!name || !email || !phone || !password)
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
    }

    const user = await User.create({ name, email: email.toLowerCase().trim(), phone, password, accountType });
    console.log('✅ New user registered:', user.email);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, accountType: user.accountType, joinedOn: user.joinedOn }
    });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  console.log('🔑 Login attempt:', req.body.email);
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Please enter email and password.' });

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log('👤 User found:', user ? 'YES' : 'NO');

    if (!user)
      return res.status(401).json({ success: false, message: 'No account found with this email. Please register first.' });

    const isMatch = await user.matchPassword(password);
    console.log('🔐 Password match:', isMatch ? 'YES' : 'NO');

    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });

    console.log('✅ Login success:', user.email);
    res.json({
      success: true,
      message: 'Login successful!',
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, accountType: user.accountType, joinedOn: user.joinedOn }
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
