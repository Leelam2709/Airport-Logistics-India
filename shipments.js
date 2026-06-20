// ─── MOCK SHIPMENT DATABASE ──────────────────────────────────────
const SHIPMENTS = {
  "ALI202500001": {
    id: "ALI202500001",
    sender: { name: "Rajesh Kumar", city: "Mumbai", state: "Maharashtra" },
    receiver: { name: "Priya Sharma", city: "Delhi", state: "Delhi" },
    service: "Air Express",
    weight: "2.4 kg",
    description: "Electronic Components",
    bookedOn: "12 Apr 2025",
    estimatedDelivery: "14 Apr 2025",
    currentStatus: "delivered",
    timeline: [
      { status: "Shipment Booked", location: "Mumbai Hub", time: "12 Apr 2025, 09:15 AM", done: true },
      { status: "Picked Up from Sender", location: "Andheri West, Mumbai", time: "12 Apr 2025, 02:30 PM", done: true },
      { status: "Arrived at Origin Airport", location: "CSIA Mumbai Terminal", time: "12 Apr 2025, 06:00 PM", done: true },
      { status: "In Transit – Air Freight", location: "Mumbai → Delhi (Flight AI-304)", time: "13 Apr 2025, 07:45 AM", done: true },
      { status: "Arrived at Destination Hub", location: "IGI Cargo Terminal, Delhi", time: "13 Apr 2025, 09:20 AM", done: true },
      { status: "Out for Delivery", location: "South Delhi Branch", time: "14 Apr 2025, 08:00 AM", done: true },
      { status: "Delivered Successfully", location: "Delivered to Priya Sharma", time: "14 Apr 2025, 11:42 AM", done: true }
    ]
  },
  "ALI202500002": {
    id: "ALI202500002",
    sender: { name: "TechCorp India Pvt Ltd", city: "Bengaluru", state: "Karnataka" },
    receiver: { name: "Mohammed Iqbal", city: "Chennai", state: "Tamil Nadu" },
    service: "Standard Cargo",
    weight: "18.0 kg",
    description: "Server Hardware",
    bookedOn: "15 Apr 2025",
    estimatedDelivery: "18 Apr 2025",
    currentStatus: "transit",
    timeline: [
      { status: "Shipment Booked", location: "Bengaluru Hub", time: "15 Apr 2025, 10:00 AM", done: true },
      { status: "Picked Up from Sender", location: "Koramangala, Bengaluru", time: "15 Apr 2025, 04:00 PM", done: true },
      { status: "Arrived at Origin Airport", location: "Kempegowda Intl Airport", time: "15 Apr 2025, 08:30 PM", done: true },
      { status: "In Transit – Air Freight", location: "Bengaluru → Chennai (Cargo)", time: "16 Apr 2025, 06:00 AM", done: true },
      { status: "Arrived at Destination Hub", location: "Chennai Airport Cargo", time: "16 Apr 2025, 08:15 AM", done: true },
      { status: "Out for Delivery", location: "Anna Nagar Branch, Chennai", time: "Expected 18 Apr 2025", done: false },
      { status: "Delivery Scheduled", location: "Pending", time: "18 Apr 2025", done: false }
    ]
  },
  "ALI202500003": {
    id: "ALI202500003",
    sender: { name: "Sunita Mehta", city: "Ahmedabad", state: "Gujarat" },
    receiver: { name: "Global Textiles LLC", city: "Dubai", state: "UAE" },
    service: "International Express",
    weight: "45.5 kg",
    description: "Textile Goods – Commercial",
    bookedOn: "18 Apr 2025",
    estimatedDelivery: "21 Apr 2025",
    currentStatus: "processing",
    timeline: [
      { status: "Shipment Booked", location: "Ahmedabad Hub", time: "18 Apr 2025, 11:00 AM", done: true },
      { status: "Customs Documentation Submitted", location: "Ahmedabad Export Office", time: "18 Apr 2025, 03:45 PM", done: true },
      { status: "Customs Clearance – Pending", location: "Sardar Vallabhbhai Patel Intl Airport", time: "19 Apr 2025, 09:00 AM", done: false },
      { status: "Air Freight Dispatch", location: "AMD → DXB", time: "Expected 19 Apr 2025", done: false },
      { status: "Arrived Dubai Airport", location: "Dubai International Airport", time: "Expected 20 Apr 2025", done: false },
      { status: "Customs Clearance – Dubai", location: "Dubai Customs", time: "Expected 20 Apr 2025", done: false },
      { status: "Delivered to Recipient", location: "Dubai, UAE", time: "Expected 21 Apr 2025", done: false }
    ]
  },
  "ALI202500004": {
    id: "ALI202500004",
    sender: { name: "Amazon India", city: "Hyderabad", state: "Telangana" },
    receiver: { name: "Ankit Verma", city: "Pune", state: "Maharashtra" },
    service: "Same Day Delivery",
    weight: "1.2 kg",
    description: "Consumer Electronics",
    bookedOn: "21 Apr 2025",
    estimatedDelivery: "21 Apr 2025",
    currentStatus: "transit",
    timeline: [
      { status: "Shipment Booked", location: "Hyderabad FC", time: "21 Apr 2025, 06:00 AM", done: true },
      { status: "Picked Up", location: "Gachibowli FC, Hyderabad", time: "21 Apr 2025, 07:30 AM", done: true },
      { status: "In Transit", location: "Hyderabad → Pune (Road)", time: "21 Apr 2025, 09:00 AM", done: true },
      { status: "Out for Delivery", location: "Kothrud Branch, Pune", time: "Expected by 8:00 PM", done: false },
      { status: "Delivered", location: "Pending", time: "Expected 21 Apr 2025", done: false }
    ]
  }
};

function getShipment(id) {
  return SHIPMENTS[id.toUpperCase().trim()] || null;
}

function getAllShipments() {
  return Object.values(SHIPMENTS);
}

function statusLabel(s) {
  const map = { delivered: 'Delivered', transit: 'In Transit', processing: 'Processing', pending: 'Pending' };
  return map[s] || s;
}
