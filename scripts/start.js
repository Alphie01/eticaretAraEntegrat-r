#!/usr/bin/env node

const cluster = require('cluster');
const os = require('os');
const path = require('path');
require('dotenv').config();

const numCPUs = os.cpus().length;
const logger = require('../src/utils/logger');

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`);
  
  // Fork workers for job processing
  const numWorkers = process.env.WORKER_PROCESSES || Math.min(2, numCPUs);
  
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork({ WORKER_TYPE: 'job' });
    logger.info(`Job worker ${worker.process.pid} started`);
  }
  
  // Fork API server
  const apiWorker = cluster.fork({ WORKER_TYPE: 'api' });
  logger.info(`API server ${apiWorker.process.pid} started`);
  
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    
    // Restart worker
    const newWorker = cluster.fork(worker.process.env);
    logger.info(`New worker ${newWorker.process.pid} started`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Master received SIGTERM, shutting down workers...');
    
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
    
    setTimeout(() => {
      logger.info('Forcing shutdown...');
      process.exit(0);
    }, 10000);
  });
  
  process.on('SIGINT', () => {
    logger.info('Master received SIGINT, shutting down workers...');
    
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGINT');
    }
    
    setTimeout(() => {
      logger.info('Forcing shutdown...');
      process.exit(0);
    }, 10000);
  });
  
} else {
  const workerType = process.env.WORKER_TYPE;
  
  if (workerType === 'job') {
    // Start job worker
    require('../src/jobs/worker');
    logger.info(`Job worker ${process.pid} initialized`);
  } else if (workerType === 'api') {
    // Start API server
    require('../src/app');
    logger.info(`API server ${process.pid} initialized`);
  }
} 