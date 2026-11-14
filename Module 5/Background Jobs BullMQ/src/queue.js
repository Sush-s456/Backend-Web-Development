'use strict';

const { Queue } = require('bullmq');

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// Create email queue
const emailQueue = new Queue('email', { connection });

module.exports = { emailQueue, connection };