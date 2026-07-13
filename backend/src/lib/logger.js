import { createRequire } from 'module';
import pino from 'pino';

const require = createRequire(import.meta.url);
const isDevelopment = process.env.NODE_ENV === 'development';
const hasPrettyTransport = isDevelopment && (() => {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
})();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: hasPrettyTransport ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

export default logger;
