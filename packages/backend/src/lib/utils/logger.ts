export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(JSON.stringify({
      level: 'info',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  error(message: string, error?: any) {
    console.error(JSON.stringify({
      level: 'error',
      context: this.context,
      message,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      timestamp: new Date().toISOString(),
    }));
  }

  warn(message: string, data?: any) {
    console.warn(JSON.stringify({
      level: 'warn',
      context: this.context,
      message,
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true') {
      console.log(JSON.stringify({
        level: 'debug',
        context: this.context,
        message,
        data,
        timestamp: new Date().toISOString(),
      }));
    }
  }
}
