export interface Logger {
  error: (line: any) => void;
  warn: (line: any) => void;
  info: (line: any) => void;
  debug: (line: any) => void;
}

export class ConsoleLogger implements Logger {
  private log(level: string, message: any) {
    const logger = (level === "ERROR") ? console.error : console.log;
    logger({
      level,
      message
    });
  }

  error(message: any) {
    this.log("ERROR", message);
  }

  warn(message: any) {
    this.log("WARN", message);
  }

  info(message: any) {
    this.log("INFO", message);
  }

  debug(message: any) {
    this.log("DEBUG", message);
  }
}

export class NoLogger implements Logger {
  error(message: any) {}
  warn(message: any) {}
  info(message: any) {}
  debug(message: any) {}
}

export const debugConsole: Logger = new ConsoleLogger();
export const devNull: Logger = new NoLogger();
