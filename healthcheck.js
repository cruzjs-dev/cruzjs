#!/usr/bin/env node

/**
 * Health check script for Docker containers
 * Checks database and Redis connections
 * Returns exit code 0 if healthy, 1 if unhealthy
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HEALTH_ENDPOINT = `http://localhost:${PORT}/health`;

// Timeout for health check (3 seconds)
const TIMEOUT = 3000;

const checkHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.get(HEALTH_ENDPOINT, { timeout: TIMEOUT }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            // Check if all services are healthy
            if (health.status === 'healthy' || health.status === 'ok') {
              resolve(true);
            } else {
              resolve(false);
            }
          } catch (e) {
            // If we can't parse, but got 200, consider it healthy
            resolve(res.statusCode === 200);
          }
        } else {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      // If connection error, service is not ready
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
};

// Run health check
checkHealth()
  .then((healthy) => {
    if (healthy) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(() => {
    process.exit(1);
  });

