import { Command } from 'commander';
export class BaseCommand {
    constructor(name, description) {
        this.command = new Command(name);
        this.command.description(description);
        this.setupOptions();
        this.setupAction();
    }
    setupOptions() {
        this.command
            .option('-v, --verbose', 'Enable verbose output')
            .option('--debug', 'Enable debug mode');
    }
    getCommand() {
        return this.command;
    }
    handleError(error, options) {
        if (options.debug) {
            console.error('Debug info:', error.stack);
        }
        else if (options.verbose) {
            console.error('Error:', error.message);
        }
        else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}
//# sourceMappingURL=base.js.map