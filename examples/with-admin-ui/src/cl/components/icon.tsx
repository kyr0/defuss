import { createRef, type Props, type Ref } from "defuss";

export interface IconProps extends Props {
  icon: string;
  className?: string; // will be forwarded as cls-custom (spec requirement)
  strokeWidth?: string | number;
  height?: string | number;
  width?: string | number;
  forcePreventRerender?: boolean;
  ref?: Ref;
  [key: string]: any;
}

/**
 * Usage:
 * <Icon icon="home" />
 * <Icon icon="user" height={24} width={24} strokeWidth={1.5} className="text-blue-700" />
 */
export const Icon = ({
  icon,
  className = "",
  strokeWidth = 2,
  height = 16,
  width = 16,
  forcePreventRerender,
  ref = createRef(),
  ...props
}: IconProps) => {
  return (
    <uk-icon
      key={Math.random() * 1000 + Date.now()}
      ref={ref}
      icon={icon}
      cls-custom={className}
      stroke-width={strokeWidth}
      height={height}
      width={width}
      force-prevent-rerender={forcePreventRerender ? "true" : undefined}
      {...props}
    />
  );
};
