import type { Props } from "defuss";

export interface HydrateProps extends Props {
  module: string; // Module path to import
  exportName?: string; // Named export to use, defaults to "default"
  props?: Record<string, any>; // Props to pass to the component
}

// components/Hydrate.tsx
export function Hydrate({
  module,
  exportName = "default",
  props = {},
  children,
}: HydrateProps) {
  // Server render: children are already SSR’d.
  // Emit a marker element and a JSON script with props.
  const id = `dh_${Math.random().toString(36).slice(2)}`;
  return (
    <>
      {children}
      <div
        data-hydrate
        data-module={module}
        data-export={exportName}
        data-props-id={id}
      />
      <script type="application/json" id={id}>
        {JSON.stringify(props)}
      </script>
    </>
  );
}
