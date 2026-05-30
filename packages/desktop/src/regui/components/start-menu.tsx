import { desktopShell } from "../../shell.js";

export const StartMenu = () => {
  const bundledApps = desktopShell.apps.filter((app) => app.bundle);

  return (
    <div class="slide-open crt">
      <div class="top">
        <h1>Aron Homberg</h1>
      </div>
      <div class="menu">
        <div class="programs">
          <ul>
            {bundledApps.map((app) => (
              <li tabindex="-1" key={app.bundle!.executable}>
                <a
                  class="program-image"
                  href="#"
                  onClick={(event: Event) => {
                    event.preventDefault();
                    desktopShell.runApp(app.bundle!.executable);
                  }}
                >
                  <img src={app.bundle!.icon} alt="" />
                </a>
                <a
                  href="#"
                  onClick={(event: Event) => {
                    event.preventDefault();
                    desktopShell.runApp(app.bundle!.executable);
                  }}
                >
                  {app.bundle!.displayName}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div class="system">
          <ul>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/documents.png" alt="" />
              </a>
              <a href="#">My Documents</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/pictures.png" alt="" />
              </a>
              <a href="#">My Pictures</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/music.png" alt="" />
              </a>
              <a href="#">My Music</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/computer.png" alt="" />
              </a>
              <a href="#">My Computer</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/control-panel.png" alt="" />
              </a>
              <a href="#">Control Panel</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/support-help.png" alt="" />
              </a>
              <a href="#">Help and Support</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/search.png" alt="" />
              </a>
              <a href="#">Search</a>
            </li>
            <li tabindex="-1">
              <a href="#" class="program-image">
                <img src="/desktop/run.png" alt="" />
              </a>
              <a href="#">Run...</a>
            </li>
          </ul>
        </div>
      </div>
      <div class="bottom"></div>
    </div>
  );
};
