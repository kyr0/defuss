export interface DateValue {
  month: number;
  year: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export const getDateValue = (date: Date): DateValue => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  date: date.getDate(),
  minute: date.getMinutes(),
  hour: date.getHours(),
  second: date.getSeconds(),
  millisecond: date.getMilliseconds(),
});
