export interface StoryStateValidationIssue {
    readonly code: string;
    readonly message: string;
    readonly path?: string;
}
export declare function validateStoryState(input: {
    readonly manifest: unknown;
    readonly currentState: unknown;
    readonly hooks: unknown;
    readonly chapterSummaries: unknown;
}): StoryStateValidationIssue[];
//# sourceMappingURL=validator.d.ts.map