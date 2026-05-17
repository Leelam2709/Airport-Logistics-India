const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const { sendBookingConfirmation, sendStatusUpdate } = require('./utils/notifications');

const app = express();
app.use(cors());
app.use(express.json());

// ── SCHEMAS ───────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  phone:       { type: String, required: true },
  password:    { type: String, required: true },
  accountType: { type: String, default: 'individual' },
  joinedOn:    { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Saved customers per user
const SavedCustomerSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  phone:   { type: String, required: true },
  address: { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: 'India' },
  label:   { type: String, default: '' }, // e.g. "Head Office", "Regular Client"
  createdAt: { type: Date, default: Date.now }
});
const SavedCustomer = mongoose.model('SavedCustomer', SavedCustomerSchema);

const POD_PREFIXES = {
  airport_to_airport:    'AAALI5051',
  door_to_door:          'DDALI3105',
  domestic_courier:      'DCALI2104',
  international_courier: 'IALI1103',
  cargo_freight:         'CFALI6769',
  express_delivery:      'EDALI7081'
};

const SERVICE_LABELS = {
  airport_to_airport:    'Airport to Airport',
  door_to_door:          'Door to Door',
  domestic_courier:      'Domestic Courier',
  international_courier: 'International Courier',
  cargo_freight:         'Cargo & Freight',
  express_delivery:      'Express Delivery'
};

const TIMELINES = {
  airport_to_airport:    ['Shipment Booked at Origin Airport','Cargo Accepted at Origin Terminal','Loaded on Aircraft','In-Flight – Air Cargo','Arrived at Destination Airport','Customs Clearance','Released from Cargo Terminal','Delivered to Recipient'],
  door_to_door:          ['Shipment Booked','Pickup Scheduled','Picked Up from Sender','Arrived at Sorting Hub','In Transit','Arrived at Destination City','Out for Delivery','Delivered to Recipient'],
  domestic_courier:      ['Shipment Booked','Picked Up from Sender','Arrived at Origin Hub','Dispatched to Destination Hub','Arrived at Destination Hub','Out for Delivery','Delivered Successfully'],
  international_courier: ['Shipment Booked','Picked Up from Sender','Export Customs Clearance','Departed Origin Country','Arrived at Transit Hub','Import Customs Clearance','Out for Delivery','Delivered to Recipient'],
  cargo_freight:         ['Freight Booking Confirmed','Cargo Received at Warehouse','Cargo Inspection Completed','Loaded for Air Transport','In Transit – Air Freight','Arrived at Destination Airport','Unloaded and Checked','Delivered to Consignee'],
  express_delivery:      ['Express Booking Confirmed','Priority Pickup Done','At Express Processing Center','Dispatched – Priority Flight','Arrived at Destination','Out for Express Delivery','Delivered – Signature Obtained']
};

const ShipmentSchema = new mongoose.Schema({
  podNumber:      { type: String, unique: true },
  serviceType:    { type: String, required: true },
  serviceLabel:   { type: String },
  sender:         { name: String, phone: String, address: String, city: String, state: String, pincode: String },
  receiver:       { name: String, phone: String, address: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } },
  packageDetails: { weight: Number, dimensions: String, description: String, quantity: Number },
  status:         { type: String, default: 'booked', enum: ['booked','processing','transit','out_for_delivery','delivered','exception'] },
  timeline:       [{ status: String, location: String, time: Date, done: Boolean }],
  estimatedDelivery: Date,
  deliveredAt:    Date,
  bookedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bookedByEmail:  String,
  bookedByPhone:  String,
  createdAt:      { type: Date, default: Date.now }
});
const Shipment = mongoose.model('Shipment', ShipmentSchema);

const ContactSchema = new mongoose.Schema({
  name: String, email: String, phone: String,
  subject: String, awbNumber: String, message: String,
  createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

// ── JWT ───────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET || 'ALI_SECRET_KEY_2025';
const genToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '7d' });
const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer')) return res.status(401).json({ success: false, message: 'Not authorised.' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch { res.status(401).json({ success: false, message: 'Token invalid.' }); }
};

// ── TEST ──────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'Airport Logistics India API v2.0 ✈', status: 'OK' }));
app.get('/api', (req, res) => res.json({ message: 'Airport Logistics India API v2.0 ✈', status: 'OK' }));

// ── AUTH ──────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Register:', req.body.email);
  const { name, email, phone, password, accountType } = req.body;
  if (!name || !email || !phone || !password)
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
  try {
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered. Please login.' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), phone, password: hashed, accountType });
    console.log('✅ Registered:', user.email);
    res.status(201).json({ success: true, message: 'Account created!', token: genToken(user._id), user: { id: user._id, name: user.name, email: user.email, phone: user.phone, accountType: user.accountType, joinedOn: user.joinedOn } });
  } catch (err) { console.error('❌', err.message); res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('🔑 Login:', req.body.email);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Please enter email and password.' });
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'No account found. Please register first.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    console.log('✅ Login:', user.email);
    res.json({ success: true, token: genToken(user._id), user: { id: user._id, name: user.name, email: user.email, phone: user.phone, accountType: user.accountType, joinedOn: user.joinedOn } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/auth/me', protect, (req, res) => res.json({ success: true, user: req.user }));

// ── SAVED CUSTOMERS ───────────────────────────────────────────────
app.get('/api/customers', protect, async (req, res) => {
  try {
    const customers = await SavedCustomer.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/customers', protect, async (req, res) => {
  try {
    const { name, phone, address, city, state, pincode, country, label } = req.body;
    if (!name || !phone || !city) return res.status(400).json({ success: false, message: 'Name, phone and city are required.' });
    const customer = await SavedCustomer.create({ userId: req.user._id, name, phone, address, city, state, pincode, country: country || 'India', label: label || '' });
    console.log('✅ Saved customer:', name);
    res.status(201).json({ success: true, message: 'Customer saved!', customer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/customers/:id', protect, async (req, res) => {
  try {
    await SavedCustomer.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Customer removed.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── BOOK SHIPMENT ─────────────────────────────────────────────────
app.post('/api/shipments/book', protect, async (req, res) => {
  console.log('📦 Booking:', req.body.serviceType);
  try {
    const { serviceType, sender, receiver, packageDetails, estimatedDelivery, saveReceiver } = req.body;
    const prefix = POD_PREFIXES[serviceType];
    if (!prefix) return res.status(400).json({ success: false, message: 'Invalid service type.' });

    // Generate unique POD
    const count = await Shipment.countDocuments({ serviceType });
    const podNumber = prefix + String(count + 1).padStart(4, '0');

    // Build timeline
    const steps = TIMELINES[serviceType] || TIMELINES.domestic_courier;
    const timeline = steps.map((s, i) => ({
      status: s,
      location: i === 0 ? (sender.city + ' Hub') : '',
      time: new Date(),
      done: i === 0
    }));

    const shipment = await Shipment.create({
      podNumber,
      serviceType,
      serviceLabel: SERVICE_LABELS[serviceType],
      sender, receiver, packageDetails,
      estimatedDelivery: estimatedDelivery || null,
      bookedBy: req.user._id,
      bookedByEmail: req.user.email,
      bookedByPhone: req.user.phone,
      timeline
    });

    console.log('✅ POD Generated:', podNumber);

    // Save receiver as regular customer if requested
    if (saveReceiver) {
      await SavedCustomer.create({
        userId: req.user._id,
        name: receiver.name, phone: receiver.phone,
        address: receiver.address, city: receiver.city,
        state: receiver.state, pincode: receiver.pincode,
        country: receiver.country || 'India',
        label: receiver.label || ''
      });
      console.log('✅ Receiver saved as regular customer');
    }

    // Send notifications
    const shipmentForNotif = { podNumber, serviceLabel: SERVICE_LABELS[serviceType], sender, receiver, packageDetails };
    sendBookingConfirmation(shipmentForNotif, req.user.email, req.user.phone);

    res.status(201).json({
      success: true,
      message: 'Shipment booked! POD generated and sent to your email & phone.',
      podNumber,
      serviceLabel: SERVICE_LABELS[serviceType],
      status: 'booked',
      bookedAt: shipment.createdAt
    });
  } catch (err) {
    console.error('❌', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TRACK ─────────────────────────────────────────────────────────
app.get('/api/shipments/track/:pod', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ podNumber: req.params.pod.toUpperCase().trim() });
    if (!shipment) return res.status(404).json({ success: false, message: 'No shipment found for this POD number.' });
    res.json({
      success: true,
      shipment: {
        podNumber: shipment.podNumber,
        serviceType: shipment.serviceType,
        serviceLabel: shipment.serviceLabel,
        sender: { name: shipment.sender.name, city: shipment.sender.city, state: shipment.sender.state },
        receiver: { name: shipment.receiver.name, city: shipment.receiver.city, state: shipment.receiver.state, country: shipment.receiver.country },
        packageDetails: shipment.packageDetails,
        status: shipment.status,
        timeline: shipment.timeline,
        estimatedDelivery: shipment.estimatedDelivery,
        deliveredAt: shipment.deliveredAt,
        createdAt: shipment.createdAt
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── MY SHIPMENTS ──────────────────────────────────────────────────
app.get('/api/shipments/my', protect, async (req, res) => {
  try {
    const shipments = await Shipment.find({ bookedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: shipments.length, shipments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── UPDATE STATUS (sends notification) ───────────────────────────
app.patch('/api/shipments/:id/status', protect, async (req, res) => {
  try {
    const { stepIndex, location } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found.' });

    shipment.timeline.forEach((step, i) => {
      if (i <= stepIndex) { step.done = true; if (location) step.location = location; }
    });

    const total = shipment.timeline.length;
    const done  = shipment.timeline.filter(s => s.done).length;
    const prevStatus = shipment.status;

    if (done === total) { shipment.status = 'delivered'; shipment.deliveredAt = new Date(); }
    else if (done >= total - 2) shipment.status = 'out_for_delivery';
    else if (done > Math.floor(total / 2)) shipment.status = 'transit';
    else shipment.status = 'processing';

    await shipment.save();

    // Send notification if status changed
    if (prevStatus !== shipment.status && shipment.bookedByEmail) {
      sendStatusUpdate({
        podNumber: shipment.podNumber,
        serviceLabel: shipment.serviceLabel,
        status: shipment.status,
        sender: { city: shipment.sender.city, state: shipment.sender.state },
        receiver: { city: shipment.receiver.city, state: shipment.receiver.state }
      }, shipment.bookedByEmail, shipment.bookedByPhone);
    }

    res.json({ success: true, message: 'Status updated. Customer notified.', shipment });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── ALL SHIPMENTS ─────────────────────────────────────────────────
app.get('/api/shipments/all', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, shipments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── CONTACT ───────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, awbNumber, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Please fill required fields.' });
    await Contact.create({ name, email, phone, subject, awbNumber, message });
    console.log('📧 Contact from:', email);
    res.json({ success: true, message: 'Message received! We will contact you within 2 hours.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── START ─────────────────────────────────────────────────────────
mongoose.connect('mongodb://127.0.0.1:27017/airport_logistics_india')
  .then(() => {
    console.log('✅ MongoDB Connected!');
    app.listen(5000, () => {
      console.log('🚀 Server running at http://localhost:5000');
      console.log('📧 Email & SMS notifications: ENABLED');
      console.log('👥 Saved customers: ENABLED');
    });
  })
  .catch(err => console.error('❌ MongoDB failed:', err.message));
