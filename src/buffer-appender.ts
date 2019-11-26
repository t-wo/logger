import { IAppender } from './defs';

class BufferAppender implements IAppender {
  private buffer: string = '';

  public write(text: string) {
    this.buffer += text;
  }

  public getBuffer(): string {
    return this.buffer;
  }
}

export { BufferAppender };
