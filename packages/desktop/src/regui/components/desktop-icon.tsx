import type { Props } from "defuss";
import type { DefussApp } from "../../app.js";

export interface DesktopIconProps extends Props {
  app: DefussApp;
}

export function DesktopIcon({ app }: DesktopIconProps) {
  const bundle = app.bundle;
  const iconSrc = bundle?.icon ?? app.config.icon;
  const label = bundle?.displayName ?? app.config.name;

  const onClick = (e: MouseEvent) => {
    // Prevent single click from firing after double click
    if (e.detail > 1) return;
    // Deselect all icons
    const allIcons = document.querySelectorAll(".desktop-icon");
    allIcons.forEach((icon) => icon.classList.remove("icon-selected"));
    // Select this icon
    const target = (e.target as HTMLElement).closest(".desktop-icon");
    if (target) {
      target.classList.add("icon-selected");
    }
  };

  const onDblClick = () => {
    app.run();
  };

  return (
    <div class="desktop-icon" onClick={onClick} onDblClick={onDblClick} key={bundle?.executable ?? label}>
      <div class="desktop-icon__image" style={{ "--icon-src": `url(${iconSrc})` } as React.CSSProperties}>
        <img src={iconSrc} alt={label} draggable={false} />
      </div>
      <span class="desktop-icon__label">{label}</span>
    </div>
  );
}
