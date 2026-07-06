import{z as e}from"zod";export const StorageModeSchema=e.enum(["webdav","local"]).default("webdav"),LocalStorageConfigSchema=e.object({path:e.string().default("")});
