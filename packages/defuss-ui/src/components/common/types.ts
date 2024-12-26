export interface ComponentProps {

  /** to uniquely identify the root DOM element without using a ref */
  id?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;
}