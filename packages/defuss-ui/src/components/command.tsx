import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:
 
<Command label="Press" kbd="⌘ J">
  <CommandGroup label="Suggestions">
    <CommandItem icon="calendar" value="/path/to/calendar">Calendar</CommandItem>
    <CommandItem icon="smile" value="/path/to/search-emoji">Search Emoji</CommandItem>
    <CommandItem icon="calculator" value="/path/to/calculator" disabled>
      Calculator
    </CommandItem>
  </CommandGroup>
  <CommandGroup label="Settings">
    <CommandItem icon="user" value="/path/to/profile">Profile</CommandItem>
    <CommandItem icon="credit-card" value="/path/to/billing">Billing</CommandItem>
    <CommandItem icon="settings" value="/path/to/settings">Settings</CommandItem>
  </CommandGroup>
</Command>

 */

export interface CommandProps extends Props {
  label: string | VNode;
  kbd?: string | VNode;
  className?: string;
  ref?: Ref;
  children?: VNode;
  [key: string]: any;
}
export const Command = ({
  label,
  kbd,
  className = "",
  ref = createRef(),
  children,
  ...props
}: CommandProps) => (
  <div className={["command", className].filter(Boolean).join(" ")} {...props}>
    <div className="command-label" style={{ marginBottom: "0.5rem" }}>
      {label}
      {kbd && (
        <span style={{ marginLeft: 8 }}>
          <kbd className="uk-kbd">{kbd}</kbd>
        </span>
      )}
    </div>
    <uk-command ref={ref}>
      <select hidden>{children}</select>
    </uk-command>
  </div>
);

export interface CommandGroupProps extends Props {
  label: string;
  children?: VNode;
  [key: string]: any;
}
export const CommandGroup = ({
  label,
  children,
  ...props
}: CommandGroupProps) => (
  <optgroup label={label} {...props}>
    {children}
  </optgroup>
);

export interface CommandItemProps extends Props {
  icon?: string;
  value: string;
  disabled?: boolean;
  children?: VNode;
  [key: string]: any;
}
export const CommandItem = ({
  icon,
  value,
  disabled = false,
  children,
  ...props
}: CommandItemProps) => (
  <option
    data-icon={icon}
    value={value}
    disabled={disabled ? true : undefined}
    {...props}
  >
    {children}
  </option>
);
