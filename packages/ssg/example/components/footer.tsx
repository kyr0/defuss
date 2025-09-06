export const Footer = ({ year }: { year: number }) => {
  return (
    <footer
      style={{
        marginTop: "2rem",
        borderTop: "1px solid #ccc",
        paddingTop: "1rem",
      }}
    >
      <p>&copy; {year} My Static Site. All rights reserved.</p>
    </footer>
  );
};
