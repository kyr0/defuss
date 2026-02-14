import type { FC } from "defuss";
import { Redirect } from "defuss";

export const Home: FC = () => {
    // Redirect to introduction or just render introduction content
    return <Redirect path="/" to="/introduction" />;
};
