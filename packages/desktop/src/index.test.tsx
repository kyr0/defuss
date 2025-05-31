/**
 * @vitest-environment happy-dom
 */
import { DefussApp } from "./app.js";
import { $ } from "./index.js";
import type {} from "./index.js";
import { Window } from "./window.js";

describe("$ is extended with window and taskbar features", () => {
  it("should add createWindow and createTaskbar to $", () => {
    expect($("body").createDesktopWindow).toBeDefined();
    expect($("body").createDesktopApp).toBeDefined();
    expect($(<div />).createDesktopAppIcon).toBeDefined();
  });

  it("should return an instance with createWindow and createTaskbar methods", async () => {
    const win = await $("body").createDesktopWindow({
      title: "Test Window",
      width: 800,
      height: 600,
      theme: "xp",
    });

    console.log(win);

    expect(win).toBeInstanceOf(Window);

    const someApp = await $("body").createDesktopApp({
      icon: "icon.png",
      name: "Test App",
      main: (app) => {
        console.log("App started:", app.config.name);
      },
    });
    expect(someApp).toBeInstanceOf(DefussApp);
  });
});
