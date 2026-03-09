const express = require('express');
const { Op } = require('sequelize');
const axios = require('axios');
const Task = require('../models/Task');

const router = express.Router();

// Notification service URL (internal K8s service)
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3003';

// Helper function to send task notification
const sendTaskNotification = async (task, userEmail, notificationType = 'created') => {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/task-event`, {
      taskId: task.id,
      taskTitle: task.title,
      taskDescription: task.description,
      taskPriority: task.priority,
      taskDueDate: task.dueDate,
      userEmail: userEmail,
      notificationType: notificationType
    });
    console.log(`Task ${notificationType} notification sent for task: ${task.id}`);
  } catch (error) {
    // Log error but don't fail the task creation
    console.error(`Failed to send task notification: ${error.message}`);
  }
};

// Get all tasks for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.userId };

    // Add filters
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      tasks: tasks.rows,
      pagination: {
        total: tasks.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(tasks.count / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.userId 
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      userId: req.user.userId,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: tags || []
    });

    // Send email notification for new task (async, non-blocking)
    sendTaskNotification(task, req.user.email, 'created');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    const task = await Task.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.userId 
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) updateData.tags = tags;

    await task.update(updateData);

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.userId 
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Task.findAll({
      where: { userId: req.user.userId },
      attributes: [
        'status',
        [Task.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const summary = {
      total: 0,
      pending: 0,
      'in-progress': 0,
      completed: 0
    };

    stats.forEach(stat => {
      summary[stat.status] = parseInt(stat.count);
      summary.total += parseInt(stat.count);
    });

    res.json({ stats: summary });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;