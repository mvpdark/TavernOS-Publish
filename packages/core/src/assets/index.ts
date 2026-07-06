// Asset extraction module exports
export {
  AssetKindSchema,
  AssetSchema,
  AssetCatalogSchema,
  type AssetKind,
  type Asset,
  type AssetCatalog,
  type AssetExtractionResult,
  emptyCatalog,
} from "./types.js";

// Asset catalog manager (merge, serialize, parse)
export { AssetCatalogManager } from "./catalog.js";

// Asset → PersonaCard converter (zero-LLM template transformation)
export {
  assetToCard,
  assetToFilename,
  isAutoSyncedCard,
  mergeAssetIntoCard,
} from "./to-card.js";
