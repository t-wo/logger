export enum Level {
  fatal = 0,
  error = 1,
  warn = 2,
  info = 3,
  debug = 4,
  trace = 5,
}

export interface IAppender {
  write(text: string): void;
  end?(): void;
  flushSync?(): void;
  flush?(): Promise<void>;
}

export interface IFormatter {
  format(time: Date, level: Level, msg: string, details?: object): string;
}
