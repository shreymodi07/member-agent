"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RubocopFixerAgent = void 0;
const ai_provider_1 = require("../providers/ai-provider");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class RubocopFixerAgent {
    constructor(config) {
        this.firstCommit = true;
        this.aiProvider = new ai_provider_1.AIProvider(config);
    }
    async fixRubocop(options) {
        const { projectPath, maxIterations = 10, diffOnly = false, staged = false, rubyRoot } = options;
        let iteration = 0;
        let totalFixes = 0;
        let totalDisables = 0;
        const disabledRules = [];
        let hasIssues = true;
        // Pre-compute changed line map if diffOnly
        const changedMap = diffOnly ? this.getChangedLines(projectPath, staged) : undefined;
        // If diffOnly and user prefers rubocop-only mode, run RuboCop auto-correct on changed files
        if (diffOnly && options.rubocopOnly) {
            if (changedMap && changedMap.size > 0) {
                await this.runRubocopAutoCorrectOnChangedFiles(projectPath, changedMap);
            }
            else {
                console.log('No changed Ruby lines detected; skipping rubocop auto-correct.');
            }
            // After running rubocop-only, return summary (no further AI fixes)
            return {
                totalIterations: 1,
                totalFixes: 0,
                totalDisables: 0,
                disabledRules: [],
                summary: 'RuboCop auto-correct applied to changed lines only.'
            };
        }
        while (hasIssues && iteration < maxIterations) {
            iteration++;
            console.log(`Iteration ${iteration}: Running ruby_gardener check...`);
            // Run the check command
            const rubyProjectRoot = rubyRoot || this.findRubyRoot(projectPath);
            if (!rubyProjectRoot) {
                console.log('⚠ No Gemfile found upwards from path. Provide --ruby-root <dir> pointing to your Ruby app root. Skipping.');
                return {
                    totalIterations: 0,
                    totalFixes: 0,
                    totalDisables: 0,
                    disabledRules: [],
                    summary: 'No Ruby project (Gemfile) detected; nothing to do.'
                };
            }
            const checkOutput = await this.runRubyGardenerCheck(rubyProjectRoot);
            let issues = this.parseIssues(checkOutput);
            if (changedMap) {
                issues = issues.filter(issue => {
                    const key = path_1.default.normalize(issue.file);
                    const lineSet = changedMap.get(key);
                    return lineSet ? lineSet.has(issue.line) : false;
                });
                console.log(`Filtering to changed lines only: ${issues.length} issues remain.`);
            }
            if (issues.length === 0) {
                hasIssues = false;
                break;
            }
            console.log(`Found ${issues.length} issues to fix.`);
            // Process each issue
            for (const issue of issues) {
                if (this.shouldDisableRule(issue.rule)) {
                    await this.disableRule(issue, rubyProjectRoot);
                    totalDisables++;
                    if (!disabledRules.includes(issue.rule)) {
                        disabledRules.push(issue.rule);
                    }
                }
                else {
                    // Attempt to fix the issue
                    const fixed = await this.fixIssue(issue, rubyProjectRoot);
                    if (fixed) {
                        totalFixes++;
                    }
                    else {
                        // If can't fix, disable
                        await this.disableRule(issue, rubyProjectRoot);
                        totalDisables++;
                        if (!disabledRules.includes(issue.rule)) {
                            disabledRules.push(issue.rule);
                        }
                    }
                }
            }
            // Commit changes
            await this.commitChanges(rubyProjectRoot, iteration);
        }
        const summary = this.generateSummary(iteration, totalFixes, totalDisables, disabledRules);
        return {
            totalIterations: iteration,
            totalFixes,
            totalDisables,
            disabledRules,
            summary
        };
    }
    async runRubyGardenerCheck(projectPath) {
        try {
            const output = (0, child_process_1.execSync)(`cd ${projectPath} && bundle exec ruby_gardener check`, { encoding: 'utf-8' });
            return output;
        }
        catch (error) {
            return error.stdout || error.stderr || '';
        }
    }
    async runRubocopAutoCorrectOnChangedFiles(projectPath, changedMap) {
        try {
            const files = Array.from(changedMap.keys()).map(f => path_1.default.join(projectPath, f)).filter(f => f.endsWith('.rb'));
            if (files.length === 0) {
                console.log('No Ruby files in diff to run rubocop on.');
                return;
            }
            // Save original contents to allow restoring unmodified lines
            const originalContents = new Map();
            for (const f of files) {
                if (await fs_extra_1.default.pathExists(f)) {
                    const content = await fs_extra_1.default.readFile(f, 'utf-8');
                    originalContents.set(f, content.split('\n'));
                }
            }
            console.log(`Running RuboCop auto-correct on ${files.length} files...`);
            try {
                (0, child_process_1.execSync)(`cd ${projectPath} && bundle exec rubocop -A ${files.map(p => '"' + p + '"').join(' ')}`, { stdio: 'inherit' });
            }
            catch (e) {
                // rubocop may exit non-zero even if corrections applied; continue
                console.log('RuboCop finished with non-zero exit code (this may be normal).');
            }
            // For each file, merge corrected lines but only keep changes on lines present in changedMap
            for (const [relPath, lineSet] of changedMap.entries()) {
                const absPath = path_1.default.join(projectPath, relPath);
                if (!await fs_extra_1.default.pathExists(absPath))
                    continue;
                const newContent = (await fs_extra_1.default.readFile(absPath, 'utf-8')).split('\n');
                const orig = originalContents.get(absPath) || [];
                // Build merged lines: for lines not in lineSet, restore original
                for (let i = 0; i < Math.max(orig.length, newContent.length); i++) {
                    const lineNum = i + 1;
                    if (!lineSet.has(lineNum)) {
                        // restore original line if exists, else keep new
                        if (orig[i] !== undefined) {
                            newContent[i] = orig[i];
                        }
                    }
                }
                await fs_extra_1.default.writeFile(absPath, newContent.join('\n'));
            }
            console.log('RuboCop auto-correct applied, non-diff lines restored to original.');
        }
        catch (err) {
            console.warn('Failed to run rubocop auto-correct on changed files:', err.message);
        }
    }
    findRubyRoot(startPath) {
        // Walk upwards until Gemfile found or filesystem root reached
        let current = path_1.default.resolve(startPath);
        try {
            while (true) {
                const gemfile = path_1.default.join(current, 'Gemfile');
                if (fs_extra_1.default.existsSync(gemfile))
                    return current;
                const parent = path_1.default.dirname(current);
                if (parent === current)
                    break;
                current = parent;
            }
        }
        catch (e) {
            // ignore and return null
        }
        return null;
    }
    getChangedLines(projectPath, staged) {
        const map = new Map();
        try {
            // Choose diff command
            const cmd = staged
                ? `cd ${projectPath} && git diff --cached -U0`
                : `cd ${projectPath} && git diff HEAD -U0`;
            const diff = (0, child_process_1.execSync)(cmd, { encoding: 'utf-8' });
            const files = [];
            let currentFile = null;
            const fileHeaderRegex = /^\+\+\+ b\/(.+)$/;
            const hunkRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
            const addedLineRegex = /^\+/;
            let currentAddedStart = 0;
            let currentAddedCount = 0;
            const lines = diff.split('\n');
            for (const line of lines) {
                const fileMatch = line.match(fileHeaderRegex);
                if (fileMatch) {
                    currentFile = fileMatch[1];
                    if (currentFile === '/dev/null') {
                        currentFile = null;
                    }
                    continue;
                }
                const hunkMatch = line.match(hunkRegex);
                if (hunkMatch) {
                    currentAddedStart = parseInt(hunkMatch[1], 10);
                    currentAddedCount = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
                    // Pre-add range for additions (even if unchanged lines not present with -U0)
                    continue;
                }
                if (currentFile && addedLineRegex.test(line) && !/^\+\+\+ /.test(line)) {
                    // Each + line increments start offset mapping
                    if (!map.has(currentFile))
                        map.set(currentFile, new Set());
                    map.get(currentFile).add(currentAddedStart);
                    currentAddedStart++;
                }
                else if (/^ /.test(line)) {
                    // context line (should not appear with -U0 but safe)
                    currentAddedStart++;
                }
            }
        }
        catch (e) {
            console.warn('Failed to compute diff; proceeding without diff-only filter.', e.message);
        }
        return map;
    }
    parseIssues(output) {
        const issues = [];
        const lines = output.split('\n');
        for (const line of lines) {
            // Assume format: file.rb:line:col: message (rule)
            const match = line.match(/^(.+?):(\d+):\d+: (.+?) \((.+?)\)$/);
            if (match) {
                issues.push({
                    file: match[1],
                    line: parseInt(match[2]),
                    message: match[3],
                    rule: match[4]
                });
            }
        }
        return issues;
    }
    shouldDisableRule(rule) {
        const alwaysDisable = [
            'RSpec/NamedSubject',
            'RSpec/VerifiedDoubles',
            'RSpec/MessageSpies',
            'RSpec/AnyInstance'
        ];
        return alwaysDisable.includes(rule) || this.isSignificantRefactor(rule);
    }
    isSignificantRefactor(rule) {
        const significantRules = [
            'Metrics/MethodLength',
            'Metrics/ClassLength',
            'Metrics/ModuleLength',
            'Style/FrozenStringLiteralComment',
            'Layout/LineLength'
            // Add more as needed
        ];
        return significantRules.includes(rule);
    }
    async fixIssue(issue, projectPath) {
        const filePath = path_1.default.join(projectPath, issue.file);
        if (!await fs_extra_1.default.pathExists(filePath))
            return false;
        const content = await fs_extra_1.default.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const contextStart = Math.max(0, issue.line - 3);
        const contextEnd = Math.min(lines.length, issue.line + 2);
        const context = lines.slice(contextStart, contextEnd).join('\n');
        const prompt = `You are an expert Ruby developer fixing Rubocop violations.

Issue: ${issue.message}
Rule: ${issue.rule}
File: ${issue.file}
Line: ${issue.line}

Code context around the issue:
${context}

Please provide ONLY the corrected version of the problematic line(s). Do not include any explanations or extra text, just the fixed code that should replace the original.`;
        try {
            const suggestion = await this.aiProvider.generateText(prompt);
            // Assume suggestion is the fixed line(s)
            if (suggestion && suggestion.trim()) {
                // Replace the problematic line with the suggestion
                const fixedLines = suggestion.trim().split('\n');
                lines.splice(issue.line - 1, 1, ...fixedLines);
                await fs_extra_1.default.writeFile(filePath, lines.join('\n'));
                return true;
            }
        }
        catch (error) {
            console.error('Failed to fix issue:', error);
        }
        return false;
    }
    async disableRule(issue, projectPath) {
        const filePath = path_1.default.join(projectPath, issue.file);
        if (!await fs_extra_1.default.pathExists(filePath))
            return;
        const content = await fs_extra_1.default.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const lineIndex = issue.line - 1;
        // Add disable comment above the line
        const disableComment = `# rubocop:disable ${issue.rule}`;
        if (lineIndex > 0 && lines[lineIndex - 1].trim() !== disableComment) {
            lines.splice(lineIndex, 0, disableComment);
        }
        else if (lineIndex === 0) {
            lines.unshift(disableComment);
        }
        await fs_extra_1.default.writeFile(filePath, lines.join('\n'));
    }
    async commitChanges(projectPath, iteration) {
        try {
            (0, child_process_1.execSync)(`cd ${projectPath} && git add .`, { stdio: 'inherit' });
            if (this.firstCommit) {
                (0, child_process_1.execSync)(`cd ${projectPath} && git commit -m "ruby_gardener" --allow-empty`, { stdio: 'inherit' });
                this.firstCommit = false;
            }
            else {
                (0, child_process_1.execSync)(`cd ${projectPath} && git commit --amend --no-edit --allow-empty`, { stdio: 'inherit' });
            }
        }
        catch (error) {
            console.log('Commit failed, possibly no changes or not a git repo');
        }
    }
    generateSummary(iterations, fixes, disables, rules) {
        return `Completed in ${iterations} iterations. Fixed ${fixes} issues, disabled ${disables} rules: ${rules.join(', ')}`;
    }
}
exports.RubocopFixerAgent = RubocopFixerAgent;
//# sourceMappingURL=rubocop-fixer.js.map