export const isAfterMinDate = (
  value: Date | undefined,
  minDate: Date,
  inclusive: boolean,
): value is Date => {
  return (
    value instanceof Date &&
    (value.getTime() > minDate.getTime() ||
      (inclusive && value.getTime() >= minDate.getTime()))
  );
};
