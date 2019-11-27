import { expect } from 'chai';
import 'mocha';
import {Logger} from '../src';

describe('logger', () => {
  const timestamp = '\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}.\\d{3}';
  it('simple', () => {
    const appender = new Logger.BufferAppender();

    const logger = Logger.createLogger({
      streams: [
        { appender, formatter: Logger.getConsoleFormatter() },
        { appender: Logger.getConsoleAppender(), formatter: Logger.getConsoleFormatter() },
      ],
    });

    logger.trace('Hello,');
    logger.trace('World!');

    expect(appender.getBuffer()).to.match(new RegExp(`${timestamp} trace Hello,${timestamp} trace World!`));
  });
});
