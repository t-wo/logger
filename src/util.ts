export function formatTime(time: Date): string {
  return `${time.getFullYear()}-${lpad2(time.getMonth() + 1)}-${lpad2(time.getDate())} ${lpad2(
    time.getHours(),
  )}:${lpad2(time.getMinutes())}:${lpad2(time.getSeconds())}.${lpad3(time.getMilliseconds())}`;
}

export function lpad2(value: number): string {
  const result = value.toString();
  if (result.length >= 2) {
    return result;
  }
  return `0${result}`;
}

export function lpad3(value: number): string {
  const result = value.toString();
  if (result.length >= 3) {
    return result;
  }
  if (result.length === 2) {
    return `0${result}`;
  }
  return `00${result}`;
}
