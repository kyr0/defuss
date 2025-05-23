export interface DateValue {
  month: number;
  year: number;
  date: number;
}

export const getDateValue = (date: Date): DateValue => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  date: date.getDate(),
});
