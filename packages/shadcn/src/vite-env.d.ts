// define JSX elements for main interfaces found in UIkit
declare namespace JSX {
  interface IVirtualIntrinsicElements {
    "some-extra-tag": HTMLAttributes & {
      count?: number;
      onIncrement?: () => void;
    };
  }
}
