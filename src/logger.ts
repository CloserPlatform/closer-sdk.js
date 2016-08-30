export type Logger = (line: string) => void;

export const debugConsole: Logger = (line: string) => console.log("[DEBUG] " + line);

export const devNull: Logger = (line: string) => {
    // Do nothing.
};
