import { Command } from 'commander';
import { BaseCommandOptions } from '../types';
export declare abstract class BaseCommand {
    protected command: Command;
    constructor(name: string, description: string);
    protected setupOptions(): void;
    protected abstract setupAction(): void;
    getCommand(): Command;
    protected handleError(error: Error, options: BaseCommandOptions): void;
}
//# sourceMappingURL=base.d.ts.map