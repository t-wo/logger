import { BufferAppender } from './buffer-appender';
import { ConsoleAppender } from './console-appender';
import { ConsoleFormatter } from './console-formatter';
import { IAppender, IFormatter, Level } from './defs';
import { FileAppender } from './file-appender';
import { FileFormatter } from './file-formatter';

type FlexLevel = Level | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

type Impl = (time: Date, msg: string, details: object | undefined, streams: IStrictStream[], level: Level) => void;

interface IStream {
  appender: IAppender;
  formatter: IFormatter;
  level?: FlexLevel;
}

interface IStrictStream {
  appender: IAppender;
  formatter: IFormatter;
  level: Level;
}

interface IProps {
  doNotFlushOnExit?: boolean;
  streams?: IStream[];
}

interface IFormatterImpl {
  formatter: IFormatter;
  maxLevel: Level;
  idx: number;
}

export class Logger {
  public static Level = Level;
  public static BufferAppender = BufferAppender;
  public static FileAppender = FileAppender;
  public static ConsoleFormatter = ConsoleFormatter;
  public static FileFormatter = FileFormatter;

  public static createLogger(props: IProps = {}) {
    return new Logger(props);
  }

  public static getConsoleAppender(): ConsoleAppender {
    if (Logger.consoleAppender === null) {
      Logger.consoleAppender = new ConsoleAppender();
    }
    return Logger.consoleAppender;
  }

  public static getConsoleFormatter(): ConsoleFormatter {
    if (Logger.consoleFormatter === null) {
      Logger.consoleFormatter = new ConsoleFormatter();
    }
    return Logger.consoleFormatter;
  }

  public static getFileFormatter(): FileFormatter {
    if (Logger.fileFormatter === null) {
      Logger.fileFormatter = new FileFormatter();
    }
    return Logger.fileFormatter;
  }

  private static consoleAppender: ConsoleAppender | null = null;
  private static consoleFormatter: ConsoleFormatter | null = null;
  private static fileFormatter: FileFormatter | null = null;

  private static normalizedLevel(level?: FlexLevel): Level {
    switch (level) {
      case Level.fatal:
        return Level.fatal;
      case Level.error:
        return Level.error;
      case Level.warn:
        return Level.warn;
      case Level.info:
        return Level.info;
      case Level.debug:
        return Level.debug;
      case Level.trace:
        return Level.trace;
      case 'fatal':
        return Level.fatal;
      case 'error':
        return Level.error;
      case 'warn':
        return Level.warn;
      case 'info':
        return Level.info;
      case 'debug':
        return Level.debug;
      case 'trace':
        return Level.trace;
    }
    return Level.trace;
  }

  private static prepStreams(rawStreams: IStream[]): IStrictStream[] {
    return rawStreams.map(stream => ({
      appender: stream.appender,
      formatter: stream.formatter,
      level: Logger.normalizedLevel(stream.level),
    }));
  }

  private static noop(
    time: Date,
    msg: string,
    details: object | undefined,
    streams: IStrictStream[],
    level: Level,
  ): void {
    // do nothing
  }

  private streams: IStrictStream[] = [];

  private readonly impl: Impl = Logger.noop;

  constructor(props: IProps = {}) {
    this.impl = this.prep(props.streams ? props.streams : []);
    if (props.doNotFlushOnExit === true) {
      process.on('exit', this.flushSync.bind(this));
    }
  }

  public log(level: Level, msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, level);
  }

  public fatal(msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, Level.fatal);
  }

  public error(msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, Level.error);
  }

  public warn(msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, Level.warn);
  }

  public info(msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, Level.info);
  }

  public debug(msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, Level.debug);
  }

  public trace(msg: string, details?: object): void {
    this.impl(new Date(), msg, details, this.streams, Level.trace);
  }

  public flushSync(): void {
    for (const stream of this.streams) {
      if (stream.appender.flushSync) {
        stream.appender.flushSync();
      }
    }
  }

  public async flush(): Promise<void> {
    const promises = this.streams.map(stream => {
      if (stream.appender.flush) {
        return stream.appender.flush();
      } else {
        return Promise.resolve();
      }
    });
    await Promise.all(promises);
  }

  public end() {
    for (const stream of this.streams) {
      if (stream.appender.end) {
        stream.appender.end();
      }
    }
  }

  // prepare fast log() function without ifs and loops that may use common formatters once
  private prep(rawStreams: IStream[]): Impl {
    this.streams = Logger.prepStreams(rawStreams);
    if (!this.streams.length) {
      return Logger.noop;
    }
    const formatters: IFormatterImpl[] = [];
    for (let i = 0; i < this.streams.length; ++i) {
      const stream = this.streams[i];
      let j = 0;
      const formatter = stream.formatter;
      for (; j < formatters.length; ++j) {
        if (formatters[j].formatter === formatter) {
          break;
        }
      }
      if (j < formatters.length) {
        formatters[j].maxLevel = Math.max(formatters[j].maxLevel, stream.level);
      } else {
        formatters.push({
          formatter,
          idx: i,
          maxLevel: stream.level,
        });
      }
    }

    let textForFormatters = `\n`;
    for (let i = 0; i < formatters.length; ++i) {
      const f = formatters[i];
      if (f.maxLevel >= Level.trace) {
        textForFormatters += `const f${i} = streams[${f.idx}].formatter.format(time, level, msg, details);\n`;
      } else {
        textForFormatters += `const f${i} = level <= ${f.maxLevel} ? streams[${f.idx}].formatter.format(time, level, msg, details) : null;\n`;
      }
    }

    let textForAppenders = `\n`;
    for (let i = 0; i < this.streams.length; ++i) {
      const s = this.streams[i];
      let j = 0;
      for (; j < formatters.length; ++j) {
        if (formatters[j].formatter === s.formatter) {
          break;
        }
      }
      if (s.level >= Level.trace) {
        textForAppenders += `streams[${i}].appender.write(f${j});\n`;
      } else {
        textForAppenders += `if (level <= ${s.level}) streams[${i}].appender.write(f${j});\n`;
      }
    }

    // low level optimization
    // follow that returning function has Impl signature
    // @ts-ignore
    return new Function(
      'time',
      'msg',
      'details',
      'streams',
      'level',
      `
            ${textForFormatters}
            ${textForAppenders}
        `,
    );
  }
}
