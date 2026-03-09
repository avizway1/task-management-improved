const express = require('express');
const axios = require('axios');
const { sendEmail, testEmailConfiguration, EMAIL_PROVIDER } = require('../services/emailService');

const router = express.Router();

// Send email notification
router.post('/email', async (req, res) => {
  try {
    const { to, subject, text, html, userId } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and text/html' 
      });
    }

    // If userId provided, get user details
    let userEmail = to;
    if (userId && !to.includes('@')) {
      try {
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
        const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
          timeout: 5000
        });
        userEmail = userResponse.data.user.email;
      } catch (error) {
        console.warn('Could not fetch user email, using provided to address');
      }
    }

    const info = await sendEmail({
      from: process.env.SES_FROM_EMAIL || process.env.SMTP_USER || 'noreply@taskmanager.com',
      to: userEmail,
      subject,
      text,
      html
    });

    // Store notification in Redis for tracking
    const notificationId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification = {
      id: notificationId,
      type: 'email',
      to: userEmail,
      subject,
      status: 'sent',
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
      userId: userId || null
    };

    await req.redisClient.setEx(
      `notification:${notificationId}`, 
      86400, // 24 hours
      JSON.stringify(notification)
    );

    res.status(200).json({
      message: 'Email sent successfully',
      notificationId,
      messageId: info.messageId,
      provider: info.provider
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Send task reminder notification
router.post('/task-reminder', async (req, res) => {
  try {
    const { userId, taskId, taskTitle, dueDate } = req.body;

    if (!userId || !taskId || !taskTitle) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, taskId, taskTitle' 
      });
    }

    // Get user details
    let userEmail;
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
      const userResponse = await axios.get(`${userServiceUrl}/api/users/${userId}`, {
        timeout: 5000
      });
      userEmail = userResponse.data.user.email;
    } catch (error) {
      return res.status(400).json({ error: 'Could not fetch user details' });
    }

    const subject = `Task Reminder: ${taskTitle}`;
    const dueDateText = dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date set';
    
    const text = `
Hi there!

This is a reminder about your task: "${taskTitle}"
Due date: ${dueDateText}

Please log in to your task manager to view and update this task.

Best regards,
Task Management Team
    `;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Task Reminder</h2>
  <p>Hi there!</p>
  <p>This is a reminder about your task:</p>
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3 style="margin: 0; color: #2c3e50;">${taskTitle}</h3>
    <p style="margin: 5px 0; color: #666;">Due date: ${dueDateText}</p>
  </div>
  <p>Please log in to your task manager to view and update this task.</p>
  <p>Best regards,<br>Task Management Team</p>
</div>
    `;

    // Send email using the email endpoint
    const emailResponse = await axios.post(`http://localhost:${process.env.PORT || 3003}/api/notifications/email`, {
      to: userEmail,
      subject,
      text,
      html,
      userId
    });

    res.status(200).json({
      message: 'Task reminder sent successfully',
      notificationId: emailResponse.data.notificationId
    });
  } catch (error) {
    console.error('Task reminder error:', error);
    res.status(500).json({ 
      error: 'Failed to send task reminder',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get notification history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get all notification keys for the user
    const keys = await req.redisClient.keys('notification:*');
    const notifications = [];

    for (const key of keys) {
      const notificationData = await req.redisClient.get(key);
      if (notificationData) {
        const notification = JSON.parse(notificationData);
        if (!userId || notification.userId === userId) {
          notifications.push(notification);
        }
      }
    }

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    res.json({
      notifications: paginatedNotifications,
      pagination: {
        total: notifications.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(notifications.length / limit)
      }
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification status
router.get('/status/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notificationData = await req.redisClient.get(`notification:${notificationId}`);
    
    if (!notificationData) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notification = JSON.parse(notificationData);
    res.json({ notification });
  } catch (error) {
    console.error('Get notification status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const info = await sendEmail({
      from: process.env.SES_FROM_EMAIL || process.env.SMTP_USER || 'noreply@taskmanager.com',
      to,
      subject: 'Test Email - Task Management System',
      text: 'This is a test email from your Task Management System. If you received this, email notifications are working correctly!',
      html: '<p>This is a test email from your <strong>Task Management System</strong>.</p><p>If you received this, email notifications are working correctly!</p>'
    });

    res.status(200).json({
      message: 'Test email sent successfully',
      messageId: info.messageId,
      provider: info.provider
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get email provider info
router.get('/provider', (req, res) => {
  res.json({
    provider: EMAIL_PROVIDER,
    configured: EMAIL_PROVIDER === 'ses' 
      ? !!(process.env.SES_FROM_EMAIL || process.env.AWS_REGION)
      : !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

// Task event notification (called by task-service)
router.post('/task-event', async (req, res) => {
  try {
    const { taskId, taskTitle, taskDescription, taskPriority, taskDueDate, userEmail, notificationType } = req.body;

    if (!taskTitle) {
      return res.status(400).json({ 
        error: 'Missing required fields: taskTitle' 
      });
    }

    // Use TASK_OWNER_EMAIL env var or fallback to SES_FROM_EMAIL
    // This is needed because SES sandbox requires verified recipients
    const recipientEmail = process.env.TASK_OWNER_EMAIL || process.env.SES_FROM_EMAIL || userEmail;

    const priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };

    const priorityColor = priorityColors[taskPriority] || '#6b7280';
    const dueDateText = taskDueDate ? new Date(taskDueDate).toLocaleDateString() : 'No due date';
    
    let subject, text, html;

    if (notificationType === 'created') {
      subject = `✅ New Task Created: ${taskTitle}`;
      text = `
Hello!

A new task has been created in your Task Management System.

Task Details:
- Title: ${taskTitle}
- Description: ${taskDescription || 'No description'}
- Priority: ${taskPriority || 'medium'}
- Due Date: ${dueDateText}

Log in to your task manager to view and manage this task.

Best regards,
Task Management System
      `;

      html = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✅ New Task Created</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hello! A new task has been created in your Task Management System.</p>
    
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; border-left: 4px solid ${priorityColor};">
      <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">${taskTitle}</h2>
      <p style="color: #64748b; margin: 0 0 15px 0;">${taskDescription || 'No description provided'}</p>
      
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <div>
          <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Priority</span>
          <p style="margin: 5px 0 0 0; color: ${priorityColor}; font-weight: 600; text-transform: capitalize;">${taskPriority || 'medium'}</p>
        </div>
        <div>
          <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Due Date</span>
          <p style="margin: 5px 0 0 0; color: #374151; font-weight: 600;">${dueDateText}</p>
        </div>
      </div>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px; text-align: center;">
      Log in to your task manager to view and manage this task.
    </p>
  </div>
  
  <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
    Task Management System - Powered by AWS
  </p>
</div>
      `;
    }

    const info = await sendEmail({
      from: process.env.SES_FROM_EMAIL || process.env.SMTP_USER || 'noreply@taskmanager.com',
      to: recipientEmail,
      subject,
      text,
      html
    });

    // Store notification in Redis
    const notificationId = `task_${notificationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification = {
      id: notificationId,
      type: `task_${notificationType}`,
      to: recipientEmail,
      subject,
      taskId,
      status: 'sent',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    };

    await req.redisClient.setEx(
      `notification:${notificationId}`, 
      86400 * 7, // 7 days
      JSON.stringify(notification)
    );

    console.log(`Task ${notificationType} email sent to ${userEmail} for task: ${taskTitle}`);

    res.status(200).json({
      message: `Task ${notificationType} notification sent successfully`,
      notificationId,
      messageId: info.messageId,
      provider: info.provider
    });
  } catch (error) {
    console.error('Task event notification error:', error);
    res.status(500).json({ 
      error: 'Failed to send task notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;