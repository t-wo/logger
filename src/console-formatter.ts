import { Level } from './defs';
import { FileFormatter } from './file-formatter';

export class ConsoleFormatter extends FileFormatter {
  public format(time: Date, level: Level, msg: string, details?: object): string {
    // for console we use generic file formatter, just need to remove tailing \n
    // substr (removing of tailing char) should be faster than adding it in FileFormatter
    const result = super.format(time, level, msg, details);
    return result.substr(0, result.length - 1);
  }
}
