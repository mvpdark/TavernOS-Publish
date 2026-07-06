import type { ImageGenConfig, ImageGenRequest, ImageGenResponse } from "./types.js";
export interface ImageGenClient {
    readonly provider: string;
    readonly baseUrl: string;
    readonly defaults: {
        readonly model: string;
        readonly size: string;
        readonly style: string;
        readonly quality: string;
    };
    /** Generate one or more images from a text prompt. */
    generate(request: ImageGenRequest): Promise<ImageGenResponse>;
}
export declare function createImageGenClient(config: ImageGenConfig): ImageGenClient;
//# sourceMappingURL=client.d.ts.map