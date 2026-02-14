// define JSX elements for main interfaces found in UIkit
declare namespace JSX {
  interface IVirtualIntrinsicElements {
    // TODO: remove example, if not needed
    "some-extra-tag": HTMLAttributes & {
      count?: number;
      onIncrement?: () => void;
    };
  }
}
