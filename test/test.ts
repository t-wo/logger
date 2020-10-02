import { expect } from 'chai';
import 'mocha';
import { Logger } from '../src';
import { sync as rimrafSync } from 'rimraf';
import { readdirSync, readFileSync } from 'fs';

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

  it('rotate', () => {
    rimrafSync('test/data/rot1');
    const appender = new Logger.FileAppender('test/data/rot1/rot.log', { maxFileSize: 5000 });
    const logger = Logger.createLogger({
      streams: [{ appender, formatter: Logger.getFileFormatter() }],
    });
    for (let i = 0; i < 250; ++i) {
      logger.info(`Just a line ${i % 10}`);
    }
    logger.flushSync();
    const content = readdirSync('test/data/rot1');
    expect(content.length).to.equal(3);
  });

  it('rotate', () => {
    rimrafSync('test/data/rot2');
    {
      const appender = new Logger.FileAppender('test/data/rot2/rot.log', { maxFileSize: 5000 });
      const logger = Logger.createLogger({
        streams: [{ appender, formatter: Logger.getFileFormatter() }],
      });
      for (let i = 0; i < 50; ++i) {
        logger.info(`Just a line ${i % 10}`);
      }
      logger.end();
    }

    {
      const appender = new Logger.FileAppender('test/data/rot2/rot.log', { maxFileSize: 5000 });
      const logger = Logger.createLogger({
        streams: [{ appender, formatter: Logger.getFileFormatter() }],
      });
      for (let i = 0; i < 80; ++i) {
        logger.info(`Just a line ${i % 10}`);
      }
      logger.end();
    }

    const content = readdirSync('test/data/rot2');
    expect(content.length).to.equal(2);
  });

  it('imm flush', async () => {
    rimrafSync('test/data/flush');
    const appender = new Logger.FileAppender('test/data/flush/a.log');
    const logger = Logger.createLogger({
      streams: [{ appender, formatter: Logger.getFileFormatter() }],
    });
    logger.info('Flush');
    logger.flushSync();
    const content = readFileSync('test/data/flush/a.log', 'utf8');
    expect(content.length).to.equal(35);
  });
});
