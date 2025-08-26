"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
const commander_1 = require("commander");
class BaseCommand {
    constructor(name, description) {
        this.command = new commander_1.Command(name);
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
exports.BaseCommand = BaseCommand;
//# sourceMappingURL=base.js.map