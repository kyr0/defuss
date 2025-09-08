export const Footer = ({ year }: { year: number }) => {
  return (
    <footer
      style={{
        marginTop: "2rem",
        borderTop: "1px solid #ccc",
        paddingTop: "1rem",
      }}
    >
      <p>
        &copy; {year} <i>defuss</i> by Aron Homberg
      </p>
    </footer>
  );
};
