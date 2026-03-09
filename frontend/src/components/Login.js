import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, TextField, Button, Typography, Box,
  Alert, Tab, Tabs, CircularProgress, Grid, Card, CardContent
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Login() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '', lastName: '', email: '', username: '', password: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(loginData);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(registerData);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Left side - Branding */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center', color: 'white', mb: 4 }}>
              <Box
                component="img"
                src="/logo.png"
                alt="Task Management Logo"
                sx={{
                  height: 120,
                  width: 'auto',
                  mb: 3,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                }}
              />
              <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                Task Manager
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.7, mb: 1, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                Built by Aviz Academy
              </Typography>
              <Typography variant="h5" sx={{ opacity: 0.9, mb: 4 }}>
                Streamline your workflow with our powerful task management system
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>✨ Smart Organization</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Organize tasks efficiently</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>🚀 Real-time Updates</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Stay synchronized</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>📊 Analytics</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Track your progress</Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Right side - Login Form */}
          <Grid item xs={12} md={6}>
            <Card sx={{ maxWidth: 500, mx: 'auto', borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'primary.main' }}>
                    Welcome Back
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sign in to your account or create a new one
                  </Typography>
                </Box>

                <Tabs 
                  value={tab} 
                  onChange={(e, newValue) => setTab(newValue)} 
                  centered
                  sx={{ mb: 3 }}
                >
                  <Tab label="Sign In" />
                  <Tab label="Sign Up" />
                </Tabs>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <TabPanel value={tab} index={0}>
                  <Box component="form" onSubmit={handleLogin}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      margin="normal"
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      margin="normal"
                      required
                      sx={{ mb: 3 }}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      sx={{ 
                        py: 1.5, 
                        fontSize: '1.1rem',
                        background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1d4ed8 30%, #2563eb 90%)',
                        }
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel value={tab} index={1}>
                  <Box component="form" onSubmit={handleRegister}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="First Name"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                          required
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          required
                        />
                      </Grid>
                    </Grid>
                    <TextField
                      fullWidth
                      label="Username"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      margin="normal"
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      margin="normal"
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      margin="normal"
                      required
                      sx={{ mb: 3 }}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      sx={{ 
                        py: 1.5, 
                        fontSize: '1.1rem',
                        background: 'linear-gradient(45deg, #7c3aed 30%, #8b5cf6 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #6d28d9 30%, #7c3aed 90%)',
                        }
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                    </Button>
                  </Box>
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer branding */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Aviz Academy Capstone Project | EKS Microservices Demo
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Login;
