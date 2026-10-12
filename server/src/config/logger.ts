import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

export const redactSensitiveData = (message: any): string => {
  if (typeof message !== 'string') {
    try {
      message = JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  return message
    // Redact Bearer JWT tokens
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/gi, 'Bearer [REDACTED_JWT]')
    // Redact raw JWT tokens
    .replace(/\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+\b/g, '[REDACTED_JWT]')
    // Redact passwords
    .replace(/(["']?password(?:Hash)?["']?\s*[:=]\s*["'])[^"']+([^"']*["'])/gi, '$1[REDACTED_PASSWORD]$2')
    // Redact refresh tokens
    .replace(/(["']?refreshToken["']?\s*[:=]\s*["'])[^"']+([^"']*["'])/gi, '$1[REDACTED_TOKEN]$2')
    // Redact 2FA secrets
    .replace(/(["']?twoFactorSecret["']?\s*[:=]\s*["'])[^"']+([^"']*["'])/gi, '$1[REDACTED_2FA_SECRET]$2')
    // Redact API keys
    .replace(/(AIza[0-9A-Za-z-_]{20,50})/g, '[REDACTED_API_KEY]')
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    // Redact phone numbers
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
};

const redactFormat = winston.format((info) => {
  if (info.message) {
    info.message = redactSensitiveData(info.message);
  }
  return info;
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  redactFormat(),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});
