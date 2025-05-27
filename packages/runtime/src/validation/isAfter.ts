export const isAfter = (
  value: Date | undefined,
  minDate: Date,
  inclusive = false,
): value is Date => {
  return (
    value instanceof Date &&
    (inclusive
      ? value.getTime() >= minDate.getTime()
      : value.getTime() > minDate.getTime())
  );
};
