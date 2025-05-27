export const isBefore = (
  value: Date | undefined,
  maxDate: Date,
  inclusive = false,
): value is Date =>
  value instanceof Date &&
  (inclusive
    ? value.getTime() <= maxDate.getTime()
    : value.getTime() < maxDate.getTime());
