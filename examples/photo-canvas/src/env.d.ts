/// <reference path="../.astro/types.d.ts" />
/// <reference path="astro/client" />

declare global {
  var refreshFsLightbox: () => void;
  var fsLightbox: {
    props: {
      autoplay: boolean;
    };
    open: (index: number) => void;
  };
}

export {};
