import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Usage:
 
<BorderLayout
  north={
    <Resizable south initialHeight={48}>
      <Header />
    </Resizable>
  }
  west={
    <Resizable east initialWidth={240}>
      <Sidebar />
    </Resizable>
  }
  east={
    <Resizable west initialWidth={160}>
      <Tools />
    </Resizable>
  }
>
  <MainContent />
</BorderLayout>

 */

export interface RegionProps {
  className?: string;
  widthClass?: string; // Tailwind classes, e.g., 'w-32'
  heightClass?: string; // Tailwind classes, e.g., 'h-8'
  style?: { [k: string]: any }; // CSS overrides
}

export interface BorderLayoutProps extends Props {
  north?: VNode;
  south?: VNode;
  west?: VNode;
  east?: VNode;
  northProps?: RegionProps;
  southProps?: RegionProps;
  westProps?: RegionProps;
  eastProps?: RegionProps;
  className?: string;
  ref?: Ref;
  style?: { [k: string]: any };
  children?: VNode;
  [key: string]: any;
}

export const BorderLayout = ({
  north,
  south,
  west,
  east,
  northProps = {},
  southProps = {},
  westProps = {},
  eastProps = {},
  className = "",
  ref = createRef(),
  style = {},
  children,
  ...props
}: BorderLayoutProps) => {
  return (
    <div
      ref={ref}
      class={["borderlayout-root flex flex-col h-full", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...props}
    >
      {north && <div class="borderlayout-north w-full">{north}</div>}
      <div class="borderlayout-main flex flex-1 min-h-0 basis-0 w-full overflow-hidden">
        {west && (
          <div class="borderlayout-west flex-shrink-0 h-full">{west}</div>
        )}
        <div class="borderlayout-center flex-1 min-w-0 min-h-0">{children}</div>
        {east && (
          <div class="borderlayout-east flex-shrink-0 h-full">{east}</div>
        )}
      </div>
      {south && <div class="borderlayout-south w-full">{south}</div>}
    </div>
  );
};
