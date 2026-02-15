import type { Props } from "defuss";

import Aside from "./aside.js";

export interface HeaderProps extends Props {
  active: string;
}

export default function Header({ active }: HeaderProps) {
  console.log("Header active for this site:", active);
  return (
    <div>
      <nav>
        <ul>
          <li>
            <a href="/" className="brand">
              <img
                width={32}
                src="https://github.com/kyr0/defuss/blob/main/assets/defuss_mascott.png?raw=true"
                alt="defuss-ssg logo"
              />
              <strong>defuss-ssg</strong>
            </a>
          </li>
        </ul>
        <ul>
          <li>
            <a href="/" className={active === "index" ? "bold" : ""}>
              Home
            </a>
          </li>
          <li>
            <a href="/tos.html" className={active === "tos" ? "bold" : ""}>
              Terms of Service
            </a>
          </li>
        </ul>
      </nav>

      <Aside active={active} />
    </div>
  );
}
