const express  = require('express');
const router   = express.Router();
const Shipment = require('../models/Shipment');
const { protect } = require('../middleware/auth');

// ── POST /api/shipments/book ──────────────────────────────────────
// POD is generated HERE — only when a real booking is confirmed
router.post('/book', protect, async (req, res) => {
  try {
    const { serviceType, sender, receiver, packageDetails, estimatedDelivery } = req.body;

    if (!serviceType || !sender || !receiver || !packageDetails)
      return res.status(400).json({ success: false, message: 'Missing required shipment fields.' });

    // Create shipment — pre-save hook generates POD and timeline
    const shipment = await Shipment.create({
      serviceType, sender, receiver, packageDetails,
      estimatedDelivery: estimatedDelivery || null,
      bookedBy: req.user._id
    });

    // Return POD clearly so frontend can show it to the customer
    res.status(201).json({
      success: true,
      message: 'Shipment booked successfully! Your POD number has been generated.',
      podNumber:    shipment.podNumber,        // e.g. EDALI70810001
      serviceLabel: shipment.serviceLabel(),   // e.g. "Express Delivery"
      status:       shipment.status,           // "booked"
      bookedAt:     shipment.createdAt,
      shipmentId:   shipment._id
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/shipments/track/:pod ─────────────────────────────────
router.get('/track/:pod', async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ podNumber: req.params.pod.toUpperCase().trim() })
      .populate('bookedBy', 'name email');

    if (!shipment)
      return res.status(404).json({ success: false, message: 'No shipment found for this POD number. Please check and try again.' });

    res.json({
      success: true,
      shipment: {
        podNumber:      shipment.podNumber,
        serviceType:    shipment.serviceType,
        serviceLabel:   shipment.serviceLabel(),
        sender:   { name: shipment.sender.name,   city: shipment.sender.city,   state: shipment.sender.state },
        receiver: { name: shipment.receiver.name, city: shipment.receiver.city, state: shipment.receiver.state, country: shipment.receiver.country },
        packageDetails: shipment.packageDetails,
        status:         shipment.status,
        timeline:       shipment.timeline,
        estimatedDelivery: shipment.estimatedDelivery,
        deliveredAt:    shipment.deliveredAt,
        createdAt:      shipment.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/shipments/my ─────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const shipments = await Shipment.find({ bookedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: shipments.length, shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/shipments/:id/status ──────────────────────────────
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { stepIndex, location } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found.' });

    shipment.timeline.forEach((step, i) => {
      if (i <= stepIndex) { step.done = true; if (location) step.location = location; }
    });

    const total = shipment.timeline.length;
    const done  = shipment.timeline.filter(s => s.done).length;
    if (done === total) { shipment.status = 'delivered'; shipment.deliveredAt = new Date(); }
    else if (done > Math.floor(total / 2)) shipment.status = 'transit';
    else shipment.status = 'processing';

    await shipment.save();
    res.json({ success: true, message: 'Shipment status updated.', shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/shipments/all ────────────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
