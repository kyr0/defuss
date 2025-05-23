export const isBeforeMaxDate = (
  value: Date | undefined,
  maxDate: Date,
  inclusive: boolean,
): value is Date =>
  !!value &&
  (inclusive
    ? value.getTime() <= maxDate.getTime()
    : value.getTime() < maxDate.getTime());
