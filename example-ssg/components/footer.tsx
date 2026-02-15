export default function Footer({ year }: { year: number }) {
  return (
    <footer
      style={{
        marginTop: "2rem",
        borderTop: "1px solid #ccc",
        paddingTop: "1rem",
      }}
    >
      <p>
        &copy; {year} <i>defuss</i> by Aron Homberg{" "}
        <a
          onMouseOver={() => {
            console.log("asdasd");
          }}
          onFocus={() => {
            console.log("asdasd");
          }}
          href="https://github.com/defuss/defuss"
        >
          {" "}
          (GitHub)
        </a>
      </p>
    </footer>
  );
}
