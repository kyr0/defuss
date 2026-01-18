import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 
<Image
  as="section"
  dataSrc="/images/bg.jpg"
  dataSrcset="/images/bg-800.jpg 800w, /images/bg-1200.jpg 1200w"
  sizes="100vw"
  loading="eager"
/>

<Image dataSrc="/images/bg.jpg" />

<Image
  dataSrc="/images/bg.jpg"
  sources={[
    { srcset: "/images/bg.avif", type: "image/avif" },
    { srcset: "/images/bg.webp", type: "image/webp" }
  ]}
/>
*/

export interface ImageSource {
  srcset: string;
  media?: string;
  type?: string;
}

export interface ImageProps extends Props {
  ref?: Ref;
  className?: string;
  style?: any;
  dataSrc: string;
  dataSrcset?: string;
  sizes?: string;
  sources?: ImageSource[] | string; // string = single source; array = multiple
  loading?: "lazy" | "eager";
  margin?: string; // e.g. "50%", "200px"
  target?: string;
  as?: "div" | "span" | "section"; // default "div"
  children?: VNode;
  [key: string]: any; // other HTML attributes
}

/**
 * This Image component is for BACKGROUND images only (not <img>).
 * It supports data-src, data-srcset, sizes, eager/lazy, sources (as JSON or single).
 */
export const Image = ({
  ref = createRef(),
  className = "",
  style = {},
  dataSrc,
  dataSrcset,
  sizes,
  sources,
  loading = "lazy",
  margin,
  target,
  as = "div",
  children,
  ...props
}: ImageProps) => {
  // Compose attribute string for data-uk-img
  const ukImgOpts: string[] = [];

  if (loading === "eager") {
    ukImgOpts.push("loading: eager");
  }
  if (margin) {
    ukImgOpts.push(`margin: ${margin}`);
  }
  if (target) {
    ukImgOpts.push(`target: ${target}`);
  }
  // src is always handled via data-src
  // sources: either json-encoded array or string; for multiple, must be encoded as JSON (stringified, then HTML-encoded externally)
  if (sources) {
    if (Array.isArray(sources)) {
      // Escaping is the responsibility of the consumer for HTML, but we'll stringify here
      ukImgOpts.push(`sources: ${JSON.stringify(sources)}`);
    } else {
      ukImgOpts.push(`sources: ${sources}`);
    }
  }
  // Compose the attribute value
  const dataUkImg = ukImgOpts.length ? ukImgOpts.join("; ") : true;

  // Always "div", "span" or custom, class uk-img ensures correct styles
  const Tag = as;

  return (
    <Tag
      ref={ref}
      className={["uk-img", className].filter(Boolean).join(" ")}
      style={style}
      data-uk-img={dataUkImg}
      data-src={dataSrc}
      data-srcset={dataSrcset}
      sizes={sizes}
      {...props}
    >
      {children}
    </Tag>
  );
};
