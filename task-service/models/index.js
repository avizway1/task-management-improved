const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_URI || 'postgresql://taskuser:taskpassword@localhost:5432/taskmanager',
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = { sequelize };