// @vitest-environment happy-dom
import { wait } from "defuss-runtime";
import { $ } from "./dequery.js";

describe("CSS class manipulation", async () => {
  it("can toggle a CSS class", async () => {
    await $(document.body).toggleClass("lol-t");
    expect(document.body.querySelector(".lol-t")).toBeDefined();
  });

  it("can untoggle a CSS class", async () => {
    await $(document.body).toggleClass("lol-ut");
    await $(document.body).toggleClass("lol-ut");
    expect(document.body.querySelector(".lol-ut")).toEqual(null);
  });

  it("can check for a class", async () => {
    await $(document.body).toggleClass("lol-c");
    expect(document.body.querySelector(".lol-c")).toBeDefined();
    expect(await $(document.body).hasClass("lol-c")).toEqual(true);
  });

  it("can check for a non-existing class", async () => {
    await $(document.body).toggleClass("lol-cn");
    await $(document.body).toggleClass("lol-cn");
    expect(await $(document.body).hasClass("lol-cn")).toEqual(false);
  });

  it("can add one class", async () => {
    await $(document.body).addClass("oneClass");
    expect(await $(document.body).hasClass("oneClass")).toEqual(true);
  });

  it("can add many classes", async () => {
    await $(document.body).addClass(["oneClass1", "nextClass1"]);
    expect(await $(document.body).hasClass("oneClass1")).toEqual(true);
    expect(await $(document.body).hasClass("nextClass1")).toEqual(true);
  });

  it("can remove one class", async () => {
    await $(document.body).addClass("oneClass2");
    await $(document.body).removeClass("oneClass2");
    expect(await $(document.body).hasClass("oneClass2")).toEqual(false);
  });

  it("can remove many classes", async () => {
    await $(document.body).addClass(["oneClass3", "nextClass3"]);
    await $(document.body).removeClass(["oneClass3", "nextClass3"]);
    expect(await $(document.body).hasClass("oneClass3")).toEqual(false);
    expect(await $(document.body).hasClass("nextClass3")).toEqual(false);
  });

  it("can set a single CSS property", async () => {
    await $(document.body).css("color", "red");
    expect(document.body.style.color).toBe("red");
  });

  it("can get a single CSS property", async () => {
    document.body.style.backgroundColor = "blue";
    const color = await $(document.body).css("background-color");
    // Computed style returns rgb format, not color names (jQuery behavior)
    expect(color === "blue" || color === "rgb(0, 0, 255)").toBe(true);
  });

  it("can set multiple CSS properties using an object", async () => {
    await $(document.body).css({
      fontSize: "16px",
      marginTop: "10px", // Use camelCase
      opacity: "0.8",
    });
    expect(document.body.style.fontSize).toBe("16px");
    expect(document.body.style.marginTop).toBe("10px");
    expect(document.body.style.opacity).toBe("0.8");
  });

  it("can animate a class (adds and removes after duration)", async () => {
    const duration = 100; // Use a shorter duration for real timer tests
    const chain = await $(document.body).animateClass("fade-out", duration);

    await wait(duration / 2); // Wait for half the duration
    // Immediately after call, class should be added
    expect(document.body.classList.contains("fade-out")).toBe(true);

    // Wait for the animation to complete

    await wait(duration * 2); // Wait for half the duration

    // After waiting, class should be removed
    expect(document.body.classList.contains("fade-out")).toBe(false);
  });
});
