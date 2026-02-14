import type { FC } from "defuss";

export interface DefussLogoProps {
    className?: string;
}

export const DefussLogo: FC<DefussLogoProps> = ({ className = "w-8 h-8" }) => {
    return (
        <img src="https://raw.githubusercontent.com/kyr0/defuss/main/assets/defuss_mascott.webp" alt="Defuss Logo" class={className} />);
};