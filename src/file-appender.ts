import fs = require('fs');
import path = require('path');
import SonicBoom = require('sonic-boom');
import Timeout = NodeJS.Timeout;
import { IAppender } from './defs';
import { formatTime } from './util';

interface IFileAppenderOptions {
  autoFlushTimeout?: number;
  maxFileSize?: number;
}

class FileAppender implements IAppender {
  private sonic: SonicBoom | null = null;
  private readonly filename: string;
  private readonly autoFlushTimeoutMilliseconds: number | null = null;
  private readonly maxFileSize: number | null = null;
  private autoFlushTimeout: Timeout | null = null;
  private flushCounter: number = 0;
  private fileSize: number = 0;
  private rotating: boolean = false;

  constructor(filename: string, options: IFileAppenderOptions = { autoFlushTimeout: 100 }) {
    this.filename = filename;
    if (options.autoFlushTimeout) {
      this.autoFlushTimeoutMilliseconds = Math.max(10, options.autoFlushTimeout);
    }
    if (options.maxFileSize) {
      this.maxFileSize = Math.max(4096, options.maxFileSize); // force minimum to 4KB
    }
  }

  public end() {
    if (this.sonic === null) {
      return;
    }
    this.sonic.end();
    this.sonic = null;
  }

  public write(text: string) {
    if (this.autoFlushTimeout === null && this.autoFlushTimeoutMilliseconds !== null) {
      const localFlushCounter = this.flushCounter;
      this.autoFlushTimeout = setTimeout(() => {
        if (this.autoFlushTimeout === null) {
          return;
        }
        if (localFlushCounter === this.flushCounter) {
          this.flush().finally(() => (this.autoFlushTimeout = null));
        } else {
          this.autoFlushTimeout = null;
        }
      }, this.autoFlushTimeoutMilliseconds);
    }
    if (this.sonic === null) {
      if (!fs.existsSync(path.dirname(this.filename))) {
        fs.mkdirSync(path.dirname(this.filename), { recursive: true });
      }
      const fd = fs.openSync(this.filename, 'a');
      const stats = fs.fstatSync(fd);
      this.fileSize = stats.size;
      // @ts-ignore
      this.sonic = new SonicBoom({ fd, minLength: 10000 });
    }

    this.fileSize += text.length;

    // @ts-ignore
    this.sonic.write(text);

    if (this.maxFileSize !== null && this.fileSize >= this.maxFileSize) {
      this.rotate();
    }
  }

  public async flush() {
    this.flushCounter += 1;
    if (this.sonic === null) {
      return;
    }
    const sonic = this.sonic;
    // uses private API to make sure file was really created
    // @ts-ignore
    if (sonic.fd < 0) {
      await new Promise(resolve => sonic.once('ready', resolve));
    }
    const promise = new Promise(resolve => sonic.once('drain', resolve));
    sonic.flush();
    await promise;
  }

  public flushSync() {
    this.flushCounter += 1;
    if (this.sonic === null) {
      return;
    }
    const sonic = this.sonic;
    // uses private API to make sure file was really created
    // @ts-ignore
    if (sonic.fd >= 0) {
      sonic.flushSync();
      return;
    }

    // sonic has not opened the file yet
    // grab its buffer and reopen the file in sync way
    // @ts-ignore
    const buf = sonic._buf;
    sonic.destroy();

    const fd = fs.openSync(this.filename, 'a');
    // @ts-ignore
    const nSonic = new SonicBoom({ fd, minLength: 10000 });
    this.sonic = nSonic;
    nSonic.write(buf);
    nSonic.flushSync();
  }

  private rotate() {
    this.fileSize = 0;
    this.flushSync();
    if (this.sonic !== null) {
      this.sonic.destroy();
      this.sonic = null;
    }
    const now = new Date();
    const nowString = formatTime(now);
    const nowNameSafeString = nowString.replace(/-|\.|:|\s/g, '');
    const ext = path.extname(this.filename);
    const base = path.basename(this.filename, ext);
    const dir = path.dirname(this.filename);
    const newName = `${base}_until_${nowNameSafeString}${ext}`;
    const newPath = path.join(dir, newName);
    fs.renameSync(this.filename, newPath);

    // @ts-ignore
    this.sonic = new SonicBoom({ dest: this.filename, minLength: 10000 });
  }
}

export { FileAppender };
