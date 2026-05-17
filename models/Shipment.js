const mongoose = require('mongoose');

// ── POD PREFIX MAP ───────────────────────────────────────────────
const POD_PREFIXES = {
  'airport_to_airport':    'AAALI5051',
  'door_to_door':          'DDALI3105',
  'domestic_courier':      'DCALI2104',
  'international_courier': 'IALI1103',
  'cargo_freight':         'CFALI6769',
  'express_delivery':      'EDALI7081'
};

// ── TIMELINE TEMPLATES ───────────────────────────────────────────
const TIMELINE_TEMPLATES = {
  airport_to_airport: [
    'Shipment Booked at Origin Airport',
    'Cargo Accepted at Origin Terminal',
    'Loaded on Aircraft',
    'In-Flight – Air Cargo',
    'Arrived at Destination Airport',
    'Customs Clearance at Destination',
    'Released from Cargo Terminal',
    'Delivered to Recipient'
  ],
  door_to_door: [
    'Shipment Booked',
    'Pickup Scheduled',
    'Picked Up from Sender',
    'Arrived at Sorting Hub',
    'In Transit',
    'Arrived at Destination City',
    'Out for Delivery',
    'Delivered to Recipient'
  ],
  domestic_courier: [
    'Shipment Booked',
    'Picked Up from Sender',
    'Arrived at Origin Hub',
    'Dispatched to Destination Hub',
    'Arrived at Destination Hub',
    'Out for Delivery',
    'Delivered Successfully'
  ],
  international_courier: [
    'Shipment Booked',
    'Picked Up from Sender',
    'Export Customs Clearance',
    'Departed Origin Country',
    'Arrived at Transit Hub',
    'Import Customs Clearance',
    'Out for Delivery',
    'Delivered to Recipient'
  ],
  cargo_freight: [
    'Freight Booking Confirmed',
    'Cargo Received at Warehouse',
    'Cargo Inspection Completed',
    'Loaded for Air Transport',
    'In Transit – Air Freight',
    'Arrived at Destination Airport',
    'Unloaded and Checked',
    'Delivered to Consignee'
  ],
  express_delivery: [
    'Express Booking Confirmed',
    'Priority Pickup Done',
    'At Express Processing Center',
    'Dispatched – Priority Flight',
    'Arrived at Destination',
    'Out for Express Delivery',
    'Delivered – Signature Obtained'
  ]
};

// ── SCHEMAS ──────────────────────────────────────────────────────
const TimelineEventSchema = new mongoose.Schema({
  status:   { type: String, required: true },
  location: { type: String, default: '' },
  time:     { type: Date, default: Date.now },
  done:     { type: Boolean, default: false }
}, { _id: false });

const ShipmentSchema = new mongoose.Schema({
  // POD is NOT set until booking is confirmed (pre-save hook below)
  podNumber: { type: String, unique: true, sparse: true },

  serviceType: {
    type: String,
    required: true,
    enum: Object.keys(POD_PREFIXES)
  },
  sender: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    address: { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true }
  },
  receiver: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    address: { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  packageDetails: {
    weight:      { type: Number, required: true },
    dimensions:  { type: String, default: '' },
    description: { type: String, required: true },
    quantity:    { type: Number, default: 1 }
  },
  status: {
    type: String,
    enum: ['booked', 'processing', 'transit', 'out_for_delivery', 'delivered', 'exception'],
    default: 'booked'
  },
  timeline:          [TimelineEventSchema],
  estimatedDelivery: { type: Date },
  deliveredAt:       { type: Date },
  bookedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:         { type: Date, default: Date.now }
});

// ── POD GENERATED ONLY ON FIRST SAVE (BOOKING CONFIRMED) ─────────
ShipmentSchema.pre('save', async function (next) {
  if (this.isNew) {
    // 1. Generate unique POD at the moment of booking
    const prefix = POD_PREFIXES[this.serviceType];
    const count = await mongoose.model('Shipment').countDocuments({ serviceType: this.serviceType });
    const suffix = String(count + 1).padStart(4, '0');
    this.podNumber = prefix + suffix;

    // 2. Build tracking timeline — first step marked done (booked)
    const steps = TIMELINE_TEMPLATES[this.serviceType] || TIMELINE_TEMPLATES.domestic_courier;
    this.timeline = steps.map((s, i) => ({
      status:   s,
      location: i === 0 ? (this.sender.city + ' Hub') : '',
      time:     new Date(),
      done:     i === 0
    }));
  }
  next();
});

// ── SERVICE LABEL ─────────────────────────────────────────────────
ShipmentSchema.methods.serviceLabel = function () {
  const labels = {
    airport_to_airport:    'Airport to Airport',
    door_to_door:          'Door to Door',
    domestic_courier:      'Domestic Courier',
    international_courier: 'International Courier',
    cargo_freight:         'Cargo & Freight',
    express_delivery:      'Express Delivery'
  };
  return labels[this.serviceType] || this.serviceType;
};

module.exports = mongoose.model('Shipment', ShipmentSchema);
module.exports.POD_PREFIXES = POD_PREFIXES;
