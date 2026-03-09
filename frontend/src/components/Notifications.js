import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Button,
  TextField, Chip, Tab, Tabs, Paper,
  Grid, Divider, Alert
} from '@mui/material';
import { 
  Email, Send, History, Science, CheckCircle, 
  Schedule, Error as ErrorIcon 
} from '@mui/icons-material';
import { notificationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navigation from './Navigation';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Notifications() {
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    text: '',
    html: ''
  });

  const { user } = useAuth();

  useEffect(() => {
    if (tab === 1) {
      loadNotifications();
    }
  }, [tab, user]);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getHistory(user.id);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleSendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await notificationService.sendEmail(emailData);
      setSuccess('Email sent successfully!');
      setEmailData({ to: '', subject: '', text: '', html: '' });
      if (tab === 1) loadNotifications();
    } catch (error) {
      setError('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await notificationService.testEmail(user.email);
      setSuccess('Test email sent successfully!');
      if (tab === 1) loadNotifications();
    } catch (error) {
      setError('Failed to send test email. Please check SMTP configuration.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <CheckCircle sx={{ color: '#10b981' }} />;
      case 'pending': return <Schedule sx={{ color: '#f59e0b' }} />;
      case 'failed': return <ErrorIcon sx={{ color: '#ef4444' }} />;
      default: return <Schedule sx={{ color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return { bg: '#f0fdf4', color: '#10b981' };
      case 'pending': return { bg: '#fffbeb', color: '#f59e0b' };
      case 'failed': return { bg: '#fef2f2', color: '#ef4444' };
      default: return { bg: '#f8fafc', color: '#6b7280' };
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navigation />
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Send emails and manage notification history
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Tabs 
            value={tab} 
            onChange={(e, newValue) => setTab(newValue)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': { 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: '1rem'
              }
            }}
          >
            <Tab icon={<Email />} label="Send Email" iconPosition="start" />
            <Tab icon={<History />} label="History" iconPosition="start" />
          </Tabs>

          {/* Alerts */}
          {success && (
            <Alert severity="success" sx={{ m: 3, borderRadius: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ m: 3, borderRadius: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Send Email Tab */}
          <TabPanel value={tab} index={0}>
            <Box sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                        Compose Email
                      </Typography>
                      
                      <TextField
                        fullWidth
                        label="Recipient Email"
                        type="email"
                        value={emailData.to}
                        onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                        margin="normal"
                        required
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Subject"
                        value={emailData.subject}
                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                        margin="normal"
                        required
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Message"
                        multiline
                        rows={6}
                        value={emailData.text}
                        onChange={(e) => setEmailData({ ...emailData, text: e.target.value })}
                        margin="normal"
                        required
                        sx={{ mb: 3 }}
                      />
                      
                      <Button
                        variant="contained"
                        startIcon={<Send />}
                        onClick={handleSendEmail}
                        disabled={loading || !emailData.to || !emailData.subject || !emailData.text}
                        sx={{
                          background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                        }}
                      >
                        {loading ? 'Sending...' : 'Send Email'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Quick Actions
                      </Typography>

                      <Box sx={{ mt: 3 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Science />}
                          onClick={handleTestEmail}
                          disabled={loading}
                          sx={{
                            mb: 2,
                            borderRadius: 2,
                            py: 1.5,
                            justifyContent: 'flex-start'
                          }}
                        >
                          Send Test Email to Me
                        </Button>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          <strong>Your Email:</strong> {user?.email}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Test emails will be sent to your registered email address to verify SMTP configuration.
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Notification History
              </Typography>

              {notifications.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No notifications yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Send your first email to see it appear here.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {notifications.map((notification, index) => (
                    <Grid item xs={12} key={index}>
                      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                {notification.subject || 'No Subject'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                To: {notification.to}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {notification.message || notification.text}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                              <Chip
                                icon={getStatusIcon(notification.status)}
                                label={notification.status || 'sent'}
                                size="small"
                                sx={{
                                  ...getStatusColor(notification.status),
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(notification.createdAt || notification.timestamp).toLocaleString()}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}

export default Notifications;
