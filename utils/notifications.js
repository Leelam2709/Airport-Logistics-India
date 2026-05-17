const nodemailer = require('nodemailer');

let transporter = null;
let testAccount = null;

// Auto-setup Ethereal test account
async function setupTransporter() {
  if (transporter) return transporter;
  testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  console.log('📧 Email transporter ready!');
  console.log('📧 Ethereal User:', testAccount.user);
  return transporter;
}

async function sendEmail(to, subject, html) {
  try {
    const t = await setupTransporter();
    const info = await t.sendMail({
      from: 'Airport Logistics India <noreply@airportlogistics.in>',
      to,
      subject,
      html
    });
    // This URL lets you VIEW the email in browser!
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('✅ Email sent!');
    console.log('👉 VIEW EMAIL HERE:', previewUrl);
    return previewUrl;
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
}

async function sendSMS(to, message) {
  // SMS disabled for now - shown as future enhancement
  console.log('📱 SMS would be sent to:', to);
  console.log('📱 Message:', message);
}

async function sendBookingConfirmation(shipment, userEmail, userPhone) {
  const subject = `Booking Confirmed! POD: ${shipment.podNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#050d1f;color:#e2eaf4;padding:32px;border-radius:16px;border:1px solid rgba(14,165,233,0.2)">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#0ea5e9;font-size:1.5rem;margin:0">✈ Airport Logistics India</h1>
        <p style="color:#7a95b8;margin:4px 0 0">Booking Confirmation</p>
      </div>
      <div style="background:#0a1628;border:2px solid #10b981;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center">
        <div style="font-size:2rem;margin-bottom:8px">🎉</div>
        <h2 style="color:#10b981;margin:0 0 6px">Shipment Booked Successfully!</h2>
        <p style="font-family:monospace;font-size:1.6rem;color:#0ea5e9;font-weight:700;margin:8px 0">${shipment.podNumber}</p>
        <p style="color:#7a95b8;font-size:0.82rem;margin:0">${shipment.serviceLabel}</p>
      </div>
      <div style="background:#0a1628;border:1px solid rgba(14,165,233,0.15);border-radius:12px;padding:20px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse;font-size:0.88rem">
          <tr><td style="color:#7a95b8;padding:7px 0">From</td><td style="color:#e2eaf4;font-weight:600;text-align:right">${shipment.sender.name}, ${shipment.sender.city}</td></tr>
          <tr><td style="color:#7a95b8;padding:7px 0">To</td><td style="color:#e2eaf4;font-weight:600;text-align:right">${shipment.receiver.name}, ${shipment.receiver.city}</td></tr>
          <tr><td style="color:#7a95b8;padding:7px 0">Weight</td><td style="color:#e2eaf4;font-weight:600;text-align:right">${shipment.packageDetails.weight} kg</td></tr>
          <tr><td style="color:#7a95b8;padding:7px 0">Contents</td><td style="color:#e2eaf4;font-weight:600;text-align:right">${shipment.packageDetails.description}</td></tr>
          <tr><td style="color:#7a95b8;padding:7px 0">Status</td><td style="color:#10b981;font-weight:700;text-align:right">✅ Booked</td></tr>
        </table>
      </div>
      <p style="color:#7a95b8;font-size:0.78rem;text-align:center;margin:0">
        POD: <strong style="color:#0ea5e9">${shipment.podNumber}</strong> · Support: 1800-000-0000
      </p>
    </div>`;
  await sendEmail(userEmail, subject, html);
}

async function sendStatusUpdate(shipment, userEmail, userPhone) {
  const STATUS_LABELS = {
    booked: 'Shipment Booked', processing: 'Processing',
    transit: 'In Transit', out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered'
  };
  const statusLabel = STATUS_LABELS[shipment.status] || shipment.status;
  const subject = `Shipment Update: ${statusLabel} – POD ${shipment.podNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#050d1f;color:#e2eaf4;padding:32px;border-radius:16px;border:1px solid rgba(14,165,233,0.2)">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#0ea5e9;font-size:1.5rem;margin:0">✈ Airport Logistics India</h1>
        <p style="color:#7a95b8;margin:4px 0 0">Shipment Status Update</p>
      </div>
      <div style="background:#0a1628;border:2px solid #0ea5e9;border-radius:12px;padding:24px;margin-bottom:20px;text-align:center">
        <h2 style="color:#0ea5e9;margin:0 0 8px">${statusLabel}</h2>
        <p style="font-family:monospace;font-size:1.2rem;color:#e2eaf4;margin:0">${shipment.podNumber}</p>
      </div>
      <p style="color:#7a95b8;font-size:0.78rem;text-align:center;margin:0">Support: 1800-000-0000</p>
    </div>`;
  await sendEmail(userEmail, subject, html);
}

module.exports = { sendBookingConfirmation, sendStatusUpdate };