import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Button, LinearProgress, Chip, Divider, List, ListItem,
  ListItemText, ListItemIcon
} from '@mui/material';
import {
  Assignment, CheckCircle, Schedule, PlayArrow,
  TrendingUp, TrendingDown, Add, Visibility, CalendarToday, ArrowForward, GridView, BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { taskService, analyticsService } from '../services/api';
import Navigation from './Navigation';

const STATUS_COLORS = {
  completed: '#10b981',
  'in-progress': '#f59e0b',
  pending: '#ef4444',
};

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

function Dashboard() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [productivity, setProductivity] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { mode } = useThemeMode();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await taskService.getTasks();
      const tasks = response.data.tasks || [];

      const completed = tasks.filter(t => t.status === 'completed').length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      const inProgress = tasks.filter(t => t.status === 'in-progress').length;

      setStats({
        totalTasks: tasks.length,
        completedTasks: completed,
        pendingTasks: pending,
        inProgressTasks: inProgress
      });

      setPriorityData([
        { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: PRIORITY_COLORS.high },
        { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: PRIORITY_COLORS.medium },
        { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: PRIORITY_COLORS.low },
      ]);

      const sorted = [...tasks].sort((a, b) =>
        new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      );
      setRecentTasks(sorted.slice(0, 5));

      // Fetch productivity data from Python/FastAPI analytics service
      try {
        const analyticsRes = await analyticsService.getProductivity();
        setProductivity(analyticsRes.data);
      } catch {
        // Analytics service is optional — fail silently
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const statusChartData = [
    { name: 'Completed', value: stats.completedTasks, color: STATUS_COLORS.completed },
    { name: 'In Progress', value: stats.inProgressTasks, color: STATUS_COLORS['in-progress'] },
    { name: 'Pending', value: stats.pendingTasks, color: STATUS_COLORS.pending },
  ].filter(d => d.value > 0);

  const barChartData = [
    { name: 'Completed', count: stats.completedTasks, fill: STATUS_COLORS.completed },
    { name: 'In Progress', count: stats.inProgressTasks, fill: STATUS_COLORS['in-progress'] },
    { name: 'Pending', count: stats.pendingTasks, fill: STATUS_COLORS.pending },
  ];

  const statCards = [
    { title: 'Total Tasks', value: stats.totalTasks, icon: <Assignment />, color: '#3b82f6', bgColor: mode === 'dark' ? '#1e3a5f' : '#eff6ff' },
    { title: 'Completed', value: stats.completedTasks, icon: <CheckCircle />, color: '#10b981', bgColor: mode === 'dark' ? '#064e3b' : '#f0fdf4' },
    { title: 'In Progress', value: stats.inProgressTasks, icon: <PlayArrow />, color: '#f59e0b', bgColor: mode === 'dark' ? '#78350f' : '#fffbeb' },
    { title: 'Pending', value: stats.pendingTasks, icon: <Schedule />, color: '#ef4444', bgColor: mode === 'dark' ? '#7f1d1d' : '#fef2f2' },
  ];

  const getStatusColor = (status) => STATUS_COLORS[status] || '#ef4444';

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ color: '#10b981' }} />;
      case 'in-progress': return <PlayArrow sx={{ color: '#f59e0b' }} />;
      default: return <Schedule sx={{ color: '#ef4444' }} />;
    }
  };

  const chartTextColor = mode === 'dark' ? '#94a3b8' : '#64748b';

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navigation />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
            Welcome back, {user?.firstName}!
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Here's what's happening with your tasks today
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/tasks')}
              sx={{
                background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
                borderRadius: 2,
                px: 3,
                py: 1.5,
              }}
            >
              Create Task
            </Button>
            <Button
              variant="outlined"
              startIcon={<GridView />}
              onClick={() => navigate('/kanban')}
              sx={{ borderRadius: 2, px: 3, py: 1.5 }}
            >
              Kanban Board
            </Button>
            <Button
              variant="outlined"
              startIcon={<BarChartIcon />}
              onClick={() => navigate('/analytics')}
              sx={{ borderRadius: 2, px: 3, py: 1.5 }}
            >
              Analytics
            </Button>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => navigate('/tasks')}
              sx={{ borderRadius: 2, px: 3, py: 1.5 }}
            >
              View All Tasks
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: stat.color }}>
                        {loading ? '-' : stat.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: stat.bgColor,
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3 }}>
                  Task Status Distribution
                </Typography>
                {stats.totalTasks === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No tasks yet. Create tasks to see the chart.
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: mode === 'dark' ? '#1e293b' : '#fff',
                          border: 'none',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          color: mode === 'dark' ? '#f1f5f9' : '#1e293b',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ color: chartTextColor }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3 }}>
                  Priority Breakdown
                </Typography>
                {stats.totalTasks === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No tasks yet. Create tasks to see the chart.
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={priorityData} barSize={50}>
                      <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" tick={{ fill: chartTextColor }} />
                      <YAxis allowDecimals={false} tick={{ fill: chartTextColor }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: mode === 'dark' ? '#1e293b' : '#fff',
                          border: 'none',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          color: mode === 'dark' ? '#f1f5f9' : '#1e293b',
                        }}
                      />
                      <Bar dataKey="value" name="Tasks" radius={[8, 8, 0, 0]}>
                        {priorityData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Progress + Status Bar Chart */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <TrendingUp sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                    Task Progress
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Overall Completion
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {completionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completionRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: 'linear-gradient(45deg, #10b981 30%, #34d399 90%)',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${stats.completedTasks} Completed`}
                    sx={{ bgcolor: mode === 'dark' ? '#064e3b' : '#f0fdf4', color: '#10b981', fontWeight: 600 }}
                  />
                  <Chip
                    label={`${stats.inProgressTasks} In Progress`}
                    sx={{ bgcolor: mode === 'dark' ? '#78350f' : '#fffbeb', color: '#f59e0b', fontWeight: 600 }}
                  />
                  <Chip
                    label={`${stats.pendingTasks} Pending`}
                    sx={{ bgcolor: mode === 'dark' ? '#7f1d1d' : '#fef2f2', color: '#ef4444', fontWeight: 600 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
              {/* Productivity card from analytics-service (Python/FastAPI) */}
              {productivity && (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                      {productivity.improving
                        ? <TrendingUp sx={{ color: '#10b981' }} />
                        : <TrendingDown sx={{ color: '#ef4444' }} />}
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Weekly Productivity
                      </Typography>
                      <Chip
                        label="Analytics"
                        size="small"
                        sx={{ ml: 'auto', bgcolor: '#818cf820', color: '#6366f1', fontWeight: 600, fontSize: '0.65rem' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                          {productivity.currentWeekCompleted}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">This week</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {productivity.previousWeekCompleted}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Last week</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: productivity.improving ? '#10b981' : '#ef4444' }}>
                          {productivity.trend > 0 ? '+' : ''}{productivity.trend}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Trend</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Card sx={{ borderRadius: 3, flex: 1 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Assignment />}
                      onClick={() => navigate('/tasks')}
                      sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5 }}
                    >
                      Manage Tasks
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<GridView />}
                      onClick={() => navigate('/kanban')}
                      sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5 }}
                    >
                      Kanban Board
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => navigate('/notifications')}
                      sx={{ justifyContent: 'flex-start', borderRadius: 2, py: 1.5 }}
                    >
                      View Notifications
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>

        {/* Recent Tasks */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Recent Tasks
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/tasks')}
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {recentTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No tasks yet. Create your first task to get started!
              </Typography>
            ) : (
              <List disablePadding>
                {recentTasks.map((task, index) => (
                  <React.Fragment key={task.id}>
                    <ListItem
                      sx={{
                        px: 1, py: 1.5, borderRadius: 2,
                        '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' },
                      }}
                      onClick={() => navigate('/tasks')}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getStatusIcon(task.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Chip
                              label={task.status.replace('-', ' ')}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: `${getStatusColor(task.status)}15`,
                                color: getStatusColor(task.status),
                                fontWeight: 600,
                                textTransform: 'capitalize',
                              }}
                            />
                            <Chip
                              label={task.priority}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                              }}
                              variant="outlined"
                            />
                            {task.dueDate && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarToday sx={{ fontSize: 12 }} />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        }
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                      />
                    </ListItem>
                    {index < recentTasks.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          py: 3,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Task Manager | Aviz Academy Capstone Project
        </Typography>
      </Box>
    </Box>
  );
}

export default Dashboard;
