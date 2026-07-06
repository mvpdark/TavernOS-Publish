/**
 * Load a prompt template from the prompts directory and interpolate variables.
 *
 * Uses async file I/O to avoid blocking the event loop during concurrent
 * request handling. Results are cached in-memory after the first load.
 *
 * @param name - Prompt name (without .yaml extension)
 * @param variables - Variables to interpolate using {{variable}} syntax
 * @returns The interpolated prompt string
 */
export declare function loadPrompt(name: string, variables?: Readonly<Record<string, string>>): Promise<string>;
/**
 * Interpolate variables in a template string.
 */
export declare function interpolateTemplate(template: string, variables: Readonly<Record<string, string>>): string;
//# sourceMappingURL=loader.d.ts.map