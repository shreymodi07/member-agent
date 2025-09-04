import { BaseCommand } from './base';
export declare class SpecCoverageCommand extends BaseCommand {
    private aiProvider;
    private options;
    constructor();
    protected setupOptions(): void;
    protected setupAction(): void;
    private initializeProvider;
    private execute;
    private combineResults;
    private writeOutput;
}
//# sourceMappingURL=spec-coverage.d.ts.map