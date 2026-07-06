// packages/core/src/extensions/types.ts
// Extension system type definitions — defines the contract for third-party
// extensions that hook into the TavernOS pipeline, process narrative text,
// or provide custom capabilities.  This is the skeleton interface; the
// registry and loader wire extensions into the runtime.
import { z } from "zod";
export const ExtensionCapabilitySchema = z.enum([
    "pipeline-hook",
    "narrative-processor",
    "custom-agent",
    "lorebook-source",
    "export-format",
]);
export const ExtensionManifestSchema = z.object({
    name: z
        .string()
        .min(1)
        .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/, "Extension name must be lowercase alphanumeric with dots or hyphens"),
    version: z
        .string()
        .min(1)
        .regex(/^\d+\.\d+\.\d+(?:[-+].+)?$/, "Version must follow semver format (e.g. 1.0.0)"),
    description: z.string().min(1),
    author: z.string().optional(),
    minCoreVersion: z.string().optional(),
    capabilities: z.array(ExtensionCapabilitySchema).min(1),
});
//# sourceMappingURL=types.js.map