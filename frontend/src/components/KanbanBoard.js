import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Chip,
  IconButton, Snackbar, Alert, Button, Dialog, DialogTitle,
  DialogContent, TextField, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import {
  Edit, Delete, Add, CalendarToday, CheckCircle, PlayArrow, Schedule
} from '@mui/icons-material';
import { taskService } from '../services/api';
import { useThemeMode } from '../contexts/ThemeContext';
import Navigation from './Navigation';

const COLUMNS = [
  { id: 'pending', title: 'Pending', color: '#ef4444', icon: <Schedule /> },
  { id: 'in-progress', title: 'In Progress', color: '#f59e0b', icon: <PlayArrow /> },
  { id: 'completed', title: 'Completed', color: '#10b981', icon: <CheckCircle /> },
];

function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'medium', status: 'pending', dueDate: ''
  });
  const { mode } = useThemeMode();
  const dragCounter = useRef({});

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskService.getTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  // Drag handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTask(null);
    setDragOverColumn(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (e, columnId) => {
    e.preventDefault();
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) + 1;
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (e, columnId) => {
    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) - 1;
    if (dragCounter.current[columnId] <= 0) {
      dragCounter.current[columnId] = 0;
      if (dragOverColumn === columnId) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    dragCounter.current = {};

    if (!draggedTask || draggedTask.status === newStatus) return;

    try {
      await taskService.updateTask(draggedTask.id, { ...draggedTask, status: newStatus });
      setSnackbar({
        open: true,
        message: `Task moved to ${newStatus.replace('-', ' ')}`,
        severity: 'success'
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      setSnackbar({ open: true, message: 'Failed to move task', severity: 'error' });
    }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const submitData = { ...formData };
      if (!submitData.dueDate) delete submitData.dueDate;

      if (editTask) {
        await taskService.updateTask(editTask.id, submitData);
        setSnackbar({ open: true, message: 'Task updated!', severity: 'success' });
      } else {
        await taskService.createTask(submitData);
        setSnackbar({ open: true, message: 'Task created!', severity: 'success' });
      }
      setOpen(false);
      setEditTask(null);
      setFormData({ title: '', description: '', priority: 'medium', status: 'pending', dueDate: '' });
      loadTasks();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save task', severity: 'error' });
    }
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await taskService.deleteTask(taskToDelete.id);
        setSnackbar({ open: true, message: 'Task deleted!', severity: 'success' });
        loadTasks();
      } catch (error) {
        setSnackbar({ open: true, message: 'Failed to delete task', severity: 'error' });
      }
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return { bg: mode === 'dark' ? '#7f1d1d' : '#fef2f2', color: '#ef4444' };
      case 'medium': return { bg: mode === 'dark' ? '#78350f' : '#fffbeb', color: '#f59e0b' };
      default: return { bg: mode === 'dark' ? '#064e3b' : '#f0fdf4', color: '#10b981' };
    }
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Navigation />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Kanban Board
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Drag and drop tasks between columns to update status
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditTask(null);
              setFormData({ title: '', description: '', priority: 'medium', status: 'pending', dueDate: '' });
              setOpen(true);
            }}
            sx={{
              background: 'linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)',
              borderRadius: 2,
              px: 3,
              py: 1.5,
            }}
          >
            Add Task
          </Button>
        </Box>

        {/* Kanban Columns */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            minHeight: '60vh',
          }}
        >
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            const isOver = dragOverColumn === column.id;

            return (
              <Box
                key={column.id}
                onDragEnter={(e) => handleDragEnter(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                sx={{
                  bgcolor: isOver
                    ? (mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)')
                    : (mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  borderRadius: 3,
                  p: 2,
                  border: '2px dashed',
                  borderColor: isOver ? 'primary.main' : 'transparent',
                  transition: 'all 0.2s ease',
                  minHeight: 400,
                }}
              >
                {/* Column Header */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: column.color }}>{column.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {column.title}
                    </Typography>
                  </Box>
                  <Chip
                    label={columnTasks.length}
                    size="small"
                    sx={{
                      bgcolor: `${column.color}20`,
                      color: column.color,
                      fontWeight: 700,
                      minWidth: 32,
                    }}
                  />
                </Box>

                {/* Task Cards */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {columnTasks.map((task) => {
                    const priorityStyle = getPriorityColor(task.priority);
                    const overdue = isOverdue(task.dueDate, task.status);

                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        sx={{
                          borderRadius: 2,
                          cursor: 'grab',
                          border: '1px solid',
                          borderColor: overdue ? '#ef4444' : 'divider',
                          borderLeft: `4px solid ${column.color}`,
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            transform: 'translateY(-2px)',
                          },
                          '&:active': {
                            cursor: 'grabbing',
                          },
                          transition: 'all 0.2s ease',
                          userSelect: 'none',
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            {task.title}
                          </Typography>

                          {task.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 1.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {task.description}
                            </Typography>
                          )}

                          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                            <Chip
                              label={task.priority}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                bgcolor: priorityStyle.bg,
                                color: priorityStyle.color,
                                fontWeight: 600,
                                textTransform: 'capitalize',
                              }}
                            />
                            {task.dueDate && (
                              <Chip
                                icon={<CalendarToday sx={{ fontSize: '12px !important' }} />}
                                label={new Date(task.dueDate).toLocaleDateString()}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  color: overdue ? '#ef4444' : 'text.secondary',
                                  fontWeight: overdue ? 600 : 400,
                                }}
                                variant="outlined"
                              />
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(task)}
                              sx={{ color: 'primary.main', p: 0.5 }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(task)}
                              sx={{ color: 'error.main', p: 0.5 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <Box
                      sx={{
                        py: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2">
                        Drop tasks here
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Container>

      {/* Create/Edit Task Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {editTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: 2 }}>
            {editTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default KanbanBoard;
