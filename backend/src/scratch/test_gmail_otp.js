import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/tarun/OneDrive/Desktop/travel-booking-app/backend/.env' });

import { isGmailConfigured } from '../services/gmailService.js';
import { sendOtpEmail } from '../services/emailService.js';
import { randomInt } from 'crypto';

async function testGmailOtp() {
  const targetEmail = process.env.TEST_EMAIL || process.argv[2];

  if (!targetEmail) {
    console.error('Error: Please provide a recipient email via TEST_EMAIL environment variable or CLI argument.');
    console.error('Example: TEST_EMAIL=your-recipient@gmail.com node src/scratch/test_gmail_otp.js');
    process.exit(1);
  }

  if (!isGmailConfigured()) {
    console.error('Error: Gmail API is not fully configured in backend/.env.');
    console.error('Missing one or more of: GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET, GOOGLE_GMAIL_SENDER, GOOGLE_GMAIL_REFRESH_TOKEN');
    process.exit(1);
  }

  console.log('=== GMAIL API OTP DELIVERY TEST ===');
  console.log(`Provider:  Google Gmail API (v1)`);
  console.log(`Sender:    ${process.env.GOOGLE_GMAIL_SENDER}`);
  console.log(`Recipient: ${targetEmail}`);

  const testOtp = String(randomInt(100000, 999999));

  try {
    const result = await sendOtpEmail({
      toEmail: targetEmail,
      otp: testOtp,
    });

    console.log(`Status:    SUCCESS`);
    console.log(`MessageID: ${result.id}`);
    console.log('===================================');
  } catch (err) {
    console.error(`Status:    FAILURE`);
    console.error(`Error:     ${err.message}`);
    console.log('===================================');
    process.exit(1);
  }
}

testGmailOtp();

