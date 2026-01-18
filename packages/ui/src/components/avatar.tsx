import { createRef, type Props, type Ref, type VNode } from "defuss";

export type DotPosition =
  | "top"
  | "top-left"
  | "top-right"
  | "right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "left";

export interface AvatarProps extends Props {
  src?: string;
  alt?: string;
  initials?: string | VNode;
  rounded?: boolean;
  bordered?: boolean;
  dot?: boolean;
  dotPosition?: DotPosition;
  size?: string; // e.g., "w-10 h-10" (Tailwind), or use className
  // For stacked avatars, size/border/rounded/etc. can be combined by parent utilities.
  children?: VNode; // slot for stacking or custom content
  className?: string;
  ref?: Ref;
  [key: string]: any;
}

export const Avatar = ({
  src,
  alt = "",
  initials,
  rounded = false,
  bordered = false,
  dot = false,
  dotPosition = "bottom-right",
  size = "",
  className = "",
  ref = createRef(),
  children,
  ...props
}: AvatarProps) => {
  // Base and option classes
  const classes = [
    "uk-avatar",
    rounded && "uk-avatar-rounded",
    bordered && "uk-avatar-bordered",
    dot && "uk-avatar-dot",
    dot &&
      dotPosition &&
      dotPosition !== "bottom-right" &&
      `uk-avatar-dot-${dotPosition}`,
    size,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={classes} {...props}>
      {src ? (
        <img className="uk-avatar-image" src={src} alt={alt} />
      ) : initials ? (
        <span className="uk-avatar-text">{initials}</span>
      ) : (
        children
      )}
    </span>
  );
};

// For stacking, just use flex - no need for dedicated StackedAvatar component, e.g.:
//
// <div className="flex -space-x-3">
//   <Avatar src="a.jpg" size="w-8 h-8" />
//   <Avatar src="b.jpg" bordered size="w-8 h-8" />
//   <Avatar initials="AB" rounded size="w-8 h-8" />
// </div>
