const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

const pdfProcessingQueue = new Queue('pdf-processing', {
    connection: redisConnection
});

module.exports = { pdfProcessingQueue, redisConnection };


