export interface DateValue {
  month: number;
  year: number;
  date: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

/**
 * Converts a Date object into a DateValue object.
 * @param date - The Date object to convert.
 * @returns A DateValue object containing the year, month, date, hour, minute, second, and millisecond.
 */
export const getDateValue = (date: Date): DateValue => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  date: date.getDate(),
  minute: date.getMinutes(),
  hour: date.getHours(),
  second: date.getSeconds(),
  millisecond: date.getMilliseconds(),
});
