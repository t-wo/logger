import { IFormatter, Level } from './defs';
import { formatTime } from './util';

export class FileFormatter implements IFormatter {
  public format(time: Date, level: Level, msg: string, details?: object): string {
    if (details === undefined) {
      return `${formatTime(time)} ${Level[level]} ${msg}\n`;
    } else {
      return `${formatTime(time)} ${Level[level]} ${msg}\n${JSON.stringify(details, null, 2)}\n`;
    }
  }
}
