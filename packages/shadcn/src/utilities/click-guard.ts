/**
 * Creates a click-guard function that deduplicates clicks caused by
 * DOM morphing re-dispatching the same native event.
 *
 * Two invocations with the same `e.timeStamp` are treated as one click.
 */
export const createClickGuard = () => {
  let lastTs = -1;
  return (e: MouseEvent): boolean => {
    if (e.timeStamp === lastTs) return false;
    lastTs = e.timeStamp;
    return true;
  };
};
