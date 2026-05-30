import { $, createRef, type Props, type Ref } from "defuss";
import { desktopShell } from "../../shell.js";
import type { DefussApp } from "../../app.js";
import { SelectionModel } from "../../selection-model.js";
import { Window, type WindowRefState } from "./window.js";
import { DesktopIcon } from "./desktop-icon.js";

export interface DesktopProps extends Props<HTMLDivElement> {
	ref: Ref<HTMLDivElement>;
}

export function Desktop({ ref }: DesktopProps) {
  const appIconsRef = createRef<HTMLDivElement>();

  const onLaunchApp = (event: Event) => {
    const customEvent = event as CustomEvent<{ app?: DefussApp }>;
    const app = customEvent.detail?.app;
    if (!app?.bundle) return;
    void runBundledApp(app);
  };

  const resolveAppMain = async (app: DefussApp) => {
    const bundle = app.bundle;
    if (!bundle) return undefined;

    if (bundle.main) {
      return bundle.main;
    }

    if (bundle.load) {
      const loaded = await bundle.load();
      return loaded.main;
    }

    return undefined;
  };

  const runBundledApp = async (app: DefussApp) => {
    const bundle = app.bundle;
    if (!bundle) return;

    const main = await resolveAppMain(app);
    if (!main) {
      console.error(`No app main() available for ${bundle.executable}`);
      return;
    }

    const appRootRef = createRef<HTMLDivElement>();
    const winRef = createRef<HTMLDivElement, WindowRefState>();

    await $(ref).append(
      <Window
        width={bundle.width ?? 720}
        height={bundle.height ?? 480}
        title={bundle.displayName}
        id={bundle.executable}
        ref={winRef}
        onClose={() => {
          console.log(`${bundle.executable} was closed`);
        }}
      >
        <div
          class="defuss-app-root"
          ref={appRootRef}
          onMount={() => {
            void main({ app, container: appRootRef.current! });
          }}
        ></div>
      </Window>,
    );
  };

  const renderDesktopIcons = async () => {
    const appIcons = desktopShell.apps.filter((app) => app.bundle);

    await $(appIconsRef).update(
      <>
        {appIcons.map((app) => (
          <DesktopIcon app={app} key={app.bundle!.executable} />
        ))}
      </>,
    );
  };

  let selectionModel: SelectionModel | null = null;

  const onMountDesktop = () => {
    void renderDesktopIcons();

    document.addEventListener("defuss:launch-app", onLaunchApp);

    selectionModel = new SelectionModel({
      desktopElement: ref.current!,
      iconsContainer: appIconsRef.current!,
    });
    selectionModel.init();
  };

  const onUnmountDesktop = () => {
    document.removeEventListener("defuss:launch-app", onLaunchApp);
    selectionModel?.destroy();
    selectionModel = null;
  };

  return (
    <div
      class="defuss-desktop-panel crt"
      ref={ref}
      onMount={onMountDesktop}
      onUnmount={onUnmountDesktop}
    >
      <div class="desktop-icons-grid" ref={appIconsRef}></div>
    </div>
  );
}
