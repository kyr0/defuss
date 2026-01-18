import "./styles/reset.css";
import "./styles/palette.css";
import "./styles/squeezy.css";
import "./styles/style.css";

import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { $, loadLanguage, i18n, T, changeLanguage } from "defuss";
import { render } from "defuss/client";
import en from "../i18n/en.json";
import de from "../i18n/de.json";

function App() {
  loadLanguage("en", en);
  loadLanguage("de", de);
  changeLanguage("de");

  const onLinkClick = (e: MouseEvent) => {
    try {
      e.preventDefault();
      alert("You clicked a link!");
      throw new Error("I am an error!");
    } catch (e) {
      console.error("An error happened:", e);
    }
  };

  const onMount = () => {
    console.log("onMount called");
  };

  return (
    // fragments work
    <>
      <div class="pt-lg vbox justify-center" onMount={onMount}>
        <a
          href="https://vite.dev"
          target="_blank"
          rel="noreferrer"
          onClick={onLinkClick}
        >
          {/* class works */}
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a
          href="https://www.github.com/kyr0/defuss"
          target="_blank"
          rel="noreferrer"
        >
          {/* className works too */}
          <img
            src="/defuss_mascott.png"
            className="logo defuss"
            alt="defuss logo"
          />
        </a>
        <a
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={typescriptLogo}
            class="logo vanilla"
            alt="TypeScript logo"
          />
        </a>
      </div>

      <h1>Vite + defuss + TypeScript</h1>
      <div class="p-lg hbox justify-center">
        <T tag="h2" key="Welcome, {name}!" values={{ name: "defuss" }} />
        <T tag="p" key="main.description" />

        <T
          tag="button"
          key="common.toggleLanguage"
          type="button"
          class="btn"
          onClick={() => {
            changeLanguage(i18n.language === "en" ? "de" : "en");
          }}
        />
      </div>

      <p class="dim">
        Click on the Vite, TypeScript and defuss logos to learn more.
      </p>
    </>
  );
}
// initial render
render(<App />, $("#app"));
