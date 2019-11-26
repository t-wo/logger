import { IAppender } from './defs';

class ConsoleAppender implements IAppender {
  public write(text: string) {
    // tslint:disable-next-line:no-console
    console.log(text);
  }
}

export { ConsoleAppender };
