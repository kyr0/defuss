import type { Props } from "defuss";

export interface AsideProps extends Props {
  active: string;
}

export const Aside = ({ active }: AsideProps) => {
  console.log("Aside active for this site:", active);
  return (
    <aside id="documentation-menu">
      <h3>Documentation Menu</h3>
    </aside>
  );
};
