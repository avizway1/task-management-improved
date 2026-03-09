const nodemailer = require('nodemailer');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Determine email provider based on environment variables
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'smtp'; // 'smtp' or 'ses'

// AWS SES Client
let sesClient;
if (EMAIL_PROVIDER === 'ses') {
  sesClient = new SESClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1',
    // Credentials will be automatically loaded from:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. IAM role (recommended for EKS)
    // 3. AWS credentials file
  });
}

// SMTP Transporter
const createSMTPTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send email using AWS SES
const sendEmailViaSES = async ({ from, to, subject, text, html }) => {
  const params = {
    Source: from || process.env.SES_FROM_EMAIL || 'noreply@taskmanager.com',
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Text: text ? {
          Data: text,
          Charset: 'UTF-8'
        } : undefined,
        Html: html ? {
          Data: html,
          Charset: 'UTF-8'
        } : undefined
      }
    }
  };

  const command = new SendEmailCommand(params);
  const response = await sesClient.send(command);
  
  return {
    messageId: response.MessageId,
    provider: 'ses'
  };
};

// Send email using SMTP
const sendEmailViaSMTP = async ({ from, to, subject, text, html }) => {
  const transporter = createSMTPTransporter();
  
  const mailOptions = {
    from: from || process.env.SMTP_USER || 'noreply@taskmanager.com',
    to,
    subject,
    text,
    html
  };

  const info = await transporter.sendMail(mailOptions);
  
  return {
    messageId: info.messageId,
    provider: 'smtp'
  };
};

// Main send email function
const sendEmail = async ({ from, to, subject, text, html }) => {
  try {
    if (EMAIL_PROVIDER === 'ses') {
      console.log('Sending email via AWS SES...');
      return await sendEmailViaSES({ from, to, subject, text, html });
    } else {
      console.log('Sending email via SMTP...');
      return await sendEmailViaSMTP({ from, to, subject, text, html });
    }
  } catch (error) {
    console.error(`Email sending error (${EMAIL_PROVIDER}):`, error);
    throw error;
  }
};

// Test email configuration
const testEmailConfiguration = async () => {
  try {
    if (EMAIL_PROVIDER === 'ses') {
      // Test SES configuration
      const testParams = {
        Source: process.env.SES_FROM_EMAIL || 'noreply@taskmanager.com',
        Destination: {
          ToAddresses: [process.env.SES_FROM_EMAIL || 'noreply@taskmanager.com']
        },
        Message: {
          Subject: { Data: 'SES Configuration Test' },
          Body: { Text: { Data: 'This is a test email' } }
        }
      };
      const command = new SendEmailCommand(testParams);
      await sesClient.send(command);
      return { success: true, provider: 'ses' };
    } else {
      // Test SMTP configuration
      const transporter = createSMTPTransporter();
      await transporter.verify();
      return { success: true, provider: 'smtp' };
    }
  } catch (error) {
    return { success: false, provider: EMAIL_PROVIDER, error: error.message };
  }
};

module.exports = {
  sendEmail,
  testEmailConfiguration,
  EMAIL_PROVIDER
};
