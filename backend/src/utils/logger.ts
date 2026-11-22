type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const formatMessage = (level: LogLevel, message: string, ...args: unknown[]) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return { prefix, message, args };
};

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    const { prefix } = formatMessage('info', message);
    console.log(`${prefix} ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    const { prefix } = formatMessage('warn', message);
    console.warn(`${prefix} ⚠️ ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    const { prefix } = formatMessage('error', message);
    console.error(`${prefix} ❌ ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      const { prefix } = formatMessage('debug', message);
      console.debug(`${prefix} 🔍 ${message}`, ...args);
    }
  },
};
