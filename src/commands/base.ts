import { Command } from 'commander';
import { BaseCommandOptions } from '../types';

export abstract class BaseCommand {
  protected command: Command;

  constructor(name: string, description: string) {
    this.command = new Command(name);
    this.command.description(description);
    this.setupOptions();
    this.setupAction();
  }

  protected setupOptions(): void {
    this.command
      .option('-v, --verbose', 'Enable verbose output')
      .option('--debug', 'Enable debug mode');
  }

  protected abstract setupAction(): void;

  public getCommand(): Command {
    return this.command;
  }

  protected handleError(error: Error, options: BaseCommandOptions): void {
    if (options.debug) {
      console.error('Debug info:', error.stack);
    } else if (options.verbose) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}
