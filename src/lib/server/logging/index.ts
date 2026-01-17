type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] ?? LOG_LEVELS.info;

interface RequestLogData {
	requestId: string;
	method: string;
	path: string;
	status?: number;
	durationMs?: number;
	userId?: string;
	userAgent?: string;
	ip?: string;
}

/**
 * Logs a message at the specified level.
 */
function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
	if (LOG_LEVELS[level] < currentLevel) {
		return;
	}

	const timestamp = new Date().toISOString();
	const logEntry = {
		timestamp,
		level,
		message,
		...data
	};

	// In production, you might want to use a proper logging service
	if (level === 'error') {
		console.error(JSON.stringify(logEntry));
	} else if (level === 'warn') {
		console.warn(JSON.stringify(logEntry));
	} else {
		console.log(JSON.stringify(logEntry));
	}
}

export const logger = {
	debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
	info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
	warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
	error: (message: string, data?: Record<string, unknown>) => log('error', message, data),

	/**
	 * Logs a completed request.
	 */
	request: (data: RequestLogData) => {
		const level = data.status && data.status >= 400 ? 'warn' : 'info';
		log(level, 'Request completed', data as unknown as Record<string, unknown>);
	},

	/**
	 * Logs an authentication event.
	 */
	auth: (event: 'login' | 'logout' | 'register' | 'failed', userId?: string, ip?: string) => {
		log('info', `Auth event: ${event}`, { userId, ip });
	},

	/**
	 * Logs a security event.
	 */
	security: (event: string, data?: Record<string, unknown>) => {
		log('warn', `Security event: ${event}`, data);
	}
};
