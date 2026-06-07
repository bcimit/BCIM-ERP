// Quick WhatsApp test — run with: node test-whatsapp.js
require('dotenv').config();
const twilio = require('twilio');

const SID   = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM  = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`;
const TO    = process.env.WHATSAPP_ADMIN_NUMBERS?.split(',')[0]?.trim();

if (!SID || !TOKEN) { console.error('❌ Twilio credentials missing in .env'); process.exit(1); }
if (!TO)            { console.error('❌ WHATSAPP_ADMIN_NUMBERS not set in .env'); process.exit(1); }

const toFormatted = TO.startsWith('whatsapp:') ? TO : `whatsapp:${TO}`;

console.log(`\n🔄 Sending WhatsApp test message...`);
console.log(`   From : ${FROM}`);
console.log(`   To   : ${toFormatted}\n`);

const client = twilio(SID, TOKEN);

client.messages
  .create({
    from: FROM,
    to:   toFormatted,
    body: `✅ *BCIM ERP — WhatsApp Test*\n\nNotifications are working!\n\n🏗️ System: Construct ERP v3.0\n📅 Time: ${new Date().toLocaleString('en-IN')}\n\n_This is a test message from your ERP system._`,
  })
  .then(msg => {
    console.log(`✅ SUCCESS! Message SID: ${msg.sid}`);
    console.log(`   Status : ${msg.status}`);
    console.log(`\n📱 Check your WhatsApp — message should arrive in a few seconds.\n`);
  })
  .catch(err => {
    console.error(`❌ FAILED: ${err.message}`);
    if (err.code === 21408) console.error('   → Phone number not opted into sandbox. Send "join knife-gone" to +14155238886 first.');
    if (err.code === 20003) console.error('   → Invalid credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    if (err.code === 63007) console.error('   → WhatsApp channel not enabled for this number.');
  });
