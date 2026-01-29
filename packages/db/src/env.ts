import { load, getEnv as getRawEnv } from "defuss-env";

load(".env", true, false);

const DEFAULTS: Record<string, string> = {
    MONGO_CONTAINER_NAME: "defuss-db",
    MONGO_INITDB_ROOT_USERNAME: "mongoadmin",
    MONGO_INITDB_ROOT_PASSWORD: "defuss-db-password",
    MONGO_HOST: "localhost",
    MONGO_PORT: "27018",
    MONGO_AUTH_SOURCE: "admin",
};

export const getEnv = (key: string): string => {
    const val = getRawEnv(key);
    if (val) return val;

    if (key === "MONGO_CONNECTION_STRING") {
        const user = getEnv("MONGO_INITDB_ROOT_USERNAME");
        const pwd = getEnv("MONGO_INITDB_ROOT_PASSWORD");
        const host = getEnv("MONGO_HOST");
        const port = getEnv("MONGO_PORT");
        const dbName = getEnv("MONGO_CONTAINER_NAME");
        const authSource = getEnv("MONGO_AUTH_SOURCE");

        if (user && pwd) {
            return `mongodb://${user}:${pwd}@${host}:${port}/${dbName}?authSource=${authSource}`;
        }
        return `mongodb://${host}:${port}/${dbName}`;
    }

    return DEFAULTS[key] || "";
};
