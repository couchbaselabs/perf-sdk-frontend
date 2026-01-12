import { Pool } from 'pg';
import { DatabaseService } from '@/src/lib/database-service';
import { DashboardService } from '@/src/lib/dashboard-service';
import { logger } from '@/src/lib/utils/logger'

/**
 * Database connection pool management for Next.js API routes.
 * 
 * This module provides enhanced connection pooling compared to the original NestJS implementation
 * which used a single client connection. The pool manages multiple connections for better
 * performance under load.
 * 
 * Environment variables required:
 * - CB_DATABASE_USERNAME: Database username (defaults to 'postgres')
 * - CB_DATABASE: Database host (defaults to 'localhost') 
 * - CB_DATABASE_PASSWORD: Database password (required)
 */

// Load environment variables for API routes
if (typeof process !== 'undefined' && process.env) {
  logger.info('Environment check', {
    CB_DATABASE_USERNAME: process.env.CB_DATABASE_USERNAME ? 'SET' : 'UNSET',
    CB_DATABASE: process.env.CB_DATABASE ? 'SET' : 'UNSET', 
    CB_DATABASE_PASSWORD: process.env.CB_DATABASE_PASSWORD ? 'SET' : 'UNSET'
  });
}

// Ensure we reuse the pool across hot-reloads in Next.js dev mode to avoid exhausting clients
const globalForPg = global as unknown as { _perfPgPool?: Pool | null }

let dashboardService: DashboardService | null = null;
let databaseService: DatabaseService | null = null;

function createPool(): Pool {
  const isProd = process.env.NODE_ENV === 'production'
  const maxConnections = Number(process.env.CB_PG_POOL_MAX) || (isProd ? 50 : 20)
  logger.info('Creating database connection pool...', { maxConnections })
  const pool = new Pool({
    user: process.env.CB_DATABASE_USERNAME || 'postgres',
    host: process.env.CB_DATABASE || 'localhost',
    database: 'perf',
    password: process.env.CB_DATABASE_PASSWORD,
    port: 5432,
    max: maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  });

  pool.on('error', (err) => {
    logger.error('Database pool error', err);
    dashboardService = null;
    databaseService = null;
    // drop reference so next call recreates
    delete globalForPg._perfPgPool;
  });

  pool.on('connect', () => {
    logger.debug('New pool client allocated');
  });

  logger.info('Database pool created successfully');

  // Optional periodic stats logging – enable via LOG_PG_POOL_STATS=true
  if (process.env.LOG_PG_POOL_STATS === 'true') {
    const interval = Number(process.env.PG_POOL_STATS_INTERVAL_MS) || 30000
    setInterval(() => {
      logger.info('PG pool stats', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      })
    }, interval)
  }

  return pool;
}

function getPool(): Pool {
  if (!globalForPg._perfPgPool) {
    globalForPg._perfPgPool = createPool();
  }
  return globalForPg._perfPgPool;
}

/**
 * Gets or creates a singleton DashboardService instance with pooled database connection.
 * Implements the same service interface as the original NestJS DashboardService.
 */
export async function getDashboardService(): Promise<DashboardService> {
  if (dashboardService) {
    return dashboardService;
  }

  const pool = getPool();
  const dbService = new DatabaseService(pool);
  dashboardService = new DashboardService(dbService);
  
  return dashboardService;
}

/**
 * Gets or creates a singleton DatabaseService instance with pooled database connection.
 * Implements the same service interface as the original NestJS DatabaseService.
 */
export async function getDatabaseService(): Promise<DatabaseService> {
  if (databaseService) {
    return databaseService;
  }

  const pool = getPool();
  databaseService = new DatabaseService(pool);
  return databaseService;
}

// Cleanup function for graceful shutdown
export async function closeDatabase() {
  if (globalForPg._perfPgPool) {
    logger.info('Closing database pool...');
    await globalForPg._perfPgPool.end();
    globalForPg._perfPgPool = null;
    dashboardService = null;
    databaseService = null;
  }
}
