import type { StoryCategory, StoryDomain, CategoryMeta } from "./types.js";
export declare const DOMAIN_CATEGORIES: ReadonlyRecord<StoryDomain, readonly StoryCategory[]>;
export declare const CATEGORY_META: ReadonlyRecord<StoryCategory, CategoryMeta>;
/** Get the domain for a given category. */
export declare function domainOf(category: StoryCategory): StoryDomain;
/** Get metadata for a category, falling back to safe defaults. */
export declare function metaOf(category: StoryCategory): CategoryMeta;
type ReadonlyRecord<K extends string | number, V> = {
    readonly [P in K]: V;
};
export {};
//# sourceMappingURL=story-domains.d.ts.map