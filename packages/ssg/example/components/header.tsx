export const Header = ({ year }: { year: number }) => {
  return (
    <header>
      <h1>Welcome to My Static Site</h1>
      <p>Current year: {year}</p>
      <button type="button" onClick={() => alert("Button clicked!")}>
        Click Me
      </button>
      <nav>
        <ul>
          <li>
            <a href="/">Home</a>
          </li>
          <li>
            <a href="/tos.html">Terms of Service</a>
          </li>
        </ul>
      </nav>
    </header>
  );
};
