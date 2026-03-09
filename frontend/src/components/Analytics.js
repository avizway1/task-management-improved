import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  Chip, Divider, CircularProgress, Alert
} from '@mui/material';
import {
  CheckCircle, Schedule, PlayArrow, TrendingUp, TrendingDown,
  BarChart as BarChartIcon, FiberManualRecord
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { useThemeMode } from '../contexts/ThemeContext';
import { taskService, analyticsService } from '../services/api';
import Navigation from './Navigation';

/* ─── colour constants ─────────────────────────────────────────── */
const STATUS_COLORS  = { completed: '#10b981', 'in-progress': '#f59e0b', pending: '#ef4444' };
const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

/* ─── small stat card ───────────────────────────────────────────── */
function StatCard({ title, value, icon, color, bgColor, subtitle }) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color }}>{value ?? '-'}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
            )}
          </Box>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: bgColor, color }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ─── service status badge ──────────────────────────────────────── */
function ServiceBadge({ online }) {
  return (
    <Chip
      icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: online ? '#10b981 !important' : '#ef4444 !important' }} />}
      label={online ? 'Python Analytics Service: Online' : 'Python Analytics Service: Offline — showing cached data from tasks'}
      size="small"
      variant="outlined"
      sx={{
        borderColor: online ? '#10b981' : '#ef4444',
        color: online ? '#10b981' : '#ef4444',
        fontWeight: 600,
        fontSize: '0.72rem',
      }}
    />
  );
}

/* ═══ main page ════════════════════════════════════════════════════ */
export default function Analytics() {
  const { mode } = useThemeMode();

  /* local stats computed from task service (always available) */
  const [localStats, setLocalStats]   = useState(null);
  const [localLoading, setLocalLoading] = useState(true);

  /* richer data from Python analytics-service (may be offline) */
  const [serviceOnline, setServiceOnline]         = useState(false);
  const [overview, setOverview]                   = useState(null);
  const [trends, setTrends]                       = useState([]);
  const [productivity, setProductivity]           = useState(null);
  const [analyticsLoading, setAnalyticsLoading]   = useState(true);

  /* ── load tasks from task-service (baseline) ── */
  const loadLocal = useCallback(async () => {
    try {
      const res = await taskService.getTasks();
      const tasks = res.data.tasks || [];

      const completed  = tasks.filter(t => t.status === 'completed').length;
      const inProgress = tasks.filter(t => t.status === 'in-progress').length;
      const pending    = tasks.filter(t => t.status === 'pending').length;
      const now = new Date();
      const overdue = tasks.filter(
        t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
      ).length;

      setLocalStats({
        total: tasks.length, completed, inProgress, pending, overdue,
        completionRate: tasks.length > 0 ? +(completed / tasks.length * 100).toFixed(1) : 0,
        statusChart: [
          { name: 'Completed', value: completed,  color: STATUS_COLORS.completed },
          { name: 'In Progress', value: inProgress, color: STATUS_COLORS['in-progress'] },
          { name: 'Pending',    value: pending,    color: STATUS_COLORS.pending },
        ].filter(d => d.value > 0),
        priorityChart: [
          { name: 'High',   value: tasks.filter(t => t.priority === 'high').length,   color: PRIORITY_COLORS.high },
          { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: PRIORITY_COLORS.medium },
          { name: 'Low',    value: tasks.filter(t => t.priority === 'low').length,    color: PRIORITY_COLORS.low },
        ],
      });
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  /* ── load from Python analytics-service (optional enrichment) ── */
  const loadAnalytics = useCallback(async () => {
    try {
      const [ovRes, trRes, prRes] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getTrends(30),
        analyticsService.getProductivity(),
      ]);
      setOverview(ovRes.data);
      setTrends(trRes.data.trends || []);
      setProductivity(prRes.data);
      setServiceOnline(true);
    } catch {
      setServiceOnline(false);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocal();
    loadAnalytics();
  }, [loadLocal, loadAnalytics]);

  const chartText = mode === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: mode === 'dark' ? '#1e293b' : '#fff',
    border: 'none',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    color: mode === 'dark' ? '#f1f5f9' : '#1e293b',
  };
  const gridColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  /* use richer overview data when service is online, else fall back to local */
  const display = serviceOnline && overview ? {
    total:          overview.total,
    completed:      overview.completed,
    inProgress:     overview.inProgress,
    pending:        overview.pending,
    overdue:        overview.overdue,
    completionRate: overview.completionRate,
  } : localStats ? {
    total:          localStats.total,
    completed:      localStats.completed,
    inProgress:     localStats.inProgress,
    pending:        localStats.pending,
    overdue:        localStats.overdue,
    completionRate: localStats.completionRate,
  } : null;

  if (localLoading) {
    return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navigation />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 6, flex: 1 }}>

        {/* ── header ── */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <BarChartIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h3" sx={{ fontWeight: 700 }}>Analytics</Typography>
            {!analyticsLoading && <ServiceBadge online={serviceOnline} />}
          </Box>
          <Typography variant="h6" color="text.secondary">
            Full breakdown of your task performance and trends
          </Typography>
        </Box>

        {/* ── stat cards ── */}
        {display && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { title: 'Total Tasks',  value: display.total,          icon: <BarChartIcon />, color: '#3b82f6', bgColor: mode==='dark'?'#1e3a5f':'#eff6ff' },
              { title: 'Completed',    value: display.completed,       icon: <CheckCircle />, color: '#10b981', bgColor: mode==='dark'?'#064e3b':'#f0fdf4' },
              { title: 'In Progress',  value: display.inProgress,      icon: <PlayArrow />,   color: '#f59e0b', bgColor: mode==='dark'?'#78350f':'#fffbeb' },
              { title: 'Pending',      value: display.pending,         icon: <Schedule />,    color: '#ef4444', bgColor: mode==='dark'?'#7f1d1d':'#fef2f2' },
              { title: 'Overdue',      value: display.overdue,         icon: <Schedule />,    color: '#dc2626', bgColor: mode==='dark'?'#450a0a':'#fff1f2',
                subtitle: 'past due date, not completed' },
              { title: 'Completion',   value: `${display.completionRate}%`, icon: <TrendingUp />, color: '#8b5cf6', bgColor: mode==='dark'?'#4c1d95':'#f5f3ff' },
            ].map((s, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* ── productivity banner (only when service online) ── */}
        {serviceOnline && productivity && (
          <Card sx={{ borderRadius: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {productivity.improving
                  ? <TrendingUp sx={{ color: '#10b981' }} />
                  : <TrendingDown sx={{ color: '#ef4444' }} />}
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Weekly Productivity</Typography>
                <Chip label="from Python analytics-service" size="small"
                  sx={{ ml: 'auto', bgcolor: '#818cf820', color: '#6366f1', fontWeight: 600, fontSize: '0.65rem' }} />
              </Box>
              <Grid container spacing={3} textAlign="center">
                {[
                  { label: 'This week completed', value: productivity.currentWeekCompleted,  color: '#10b981' },
                  { label: 'Last week completed', value: productivity.previousWeekCompleted, color: 'text.secondary' },
                  { label: 'Week-over-week trend', value: `${productivity.trend > 0 ? '+' : ''}${productivity.trend}%`,
                    color: productivity.improving ? '#10b981' : '#ef4444' },
                ].map((item, i) => (
                  <Grid item xs={12} sm={4} key={i}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: item.color }}>{item.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* ── charts row ── */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* status donut */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Status Distribution</Typography>
                {localStats?.statusChart?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={localStats.statusChart} cx="50%" cy="50%"
                        innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {localStats.statusChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: chartText }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No tasks yet.</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* priority bar */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Priority Breakdown</Typography>
                {localStats?.priorityChart?.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={localStats.priorityChart} barSize={50}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="name" tick={{ fill: chartText }} />
                      <YAxis allowDecimals={false} tick={{ fill: chartText }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Tasks" radius={[8, 8, 0, 0]}>
                        {localStats.priorityChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">No tasks yet.</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── trends line chart (only when analytics-service is online) ── */}
        <Card sx={{ borderRadius: 3, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>Task Trends (Last 30 Days)</Typography>
              {!serviceOnline && (
                <Chip label="requires Python analytics-service" size="small"
                  sx={{ ml: 'auto', color: '#94a3b8', fontWeight: 600, fontSize: '0.65rem' }}
                  variant="outlined" />
              )}
            </Box>

            {serviceOnline && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tick={{ fill: chartText, fontSize: 11 }}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fill: chartText }} />
                  <Tooltip contentStyle={tooltipStyle}
                    labelFormatter={l => `Date: ${l}`} />
                  <Legend wrapperStyle={{ color: chartText }} />
                  <Line type="monotone" dataKey="created"   name="Created"   stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : serviceOnline && trends.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  No activity in the last 30 days.
                </Typography>
              </Box>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                The <strong>Python/FastAPI analytics-service</strong> is not reachable right now.
                Deploy it on EKS or run it locally (<code>uvicorn main:app --port 3004</code>) to see
                30-day task trends.
              </Alert>
            )}
          </CardContent>
        </Card>

      </Container>

      {/* footer */}
      <Box sx={{ py: 3, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="body2" color="text.secondary">
          Task Manager | Aviz Academy Capstone Project
        </Typography>
      </Box>
    </Box>
  );
}
