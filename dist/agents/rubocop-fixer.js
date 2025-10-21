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
        const { projectPath, maxIterations = 10, diffOnly = false, staged = false, rubyRoot, preview = false } = options;
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
                await this.runRubocopAutoCorrectOnChangedFiles(projectPath, changedMap, { preview });
            }
            else {
                console.log('No changed Ruby lines detected; skipping rubocop auto-correct.');
            }
            return {
                totalIterations: 1,
                totalFixes: 0,
                totalDisables: 0,
                disabledRules: [],
                summary: preview ? 'Preview only: listed roots/files; no RuboCop run.' : 'RuboCop auto-correct applied to changed lines only.'
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
    async runRubocopAutoCorrectOnChangedFiles(projectPath, changedMap, opts = {}) {
        // Multi-root support: group changed Ruby files by nearest Gemfile root and run per root
        try {
            const rubyFiles = Array.from(changedMap.keys())
                .filter(f => f.endsWith('.rb'))
                .map(rel => ({ rel, abs: path_1.default.join(projectPath, rel) }));
            if (rubyFiles.length === 0) {
                console.log('No Ruby files in diff to run rubocop on.');
                return;
            }
            const groups = new Map(); // key: ruby root
            for (const file of rubyFiles) {
                let rubyRoot = this.findRubyRoot(path_1.default.dirname(file.abs));
                if (!rubyRoot) {
                    // If no Gemfile upwards, skip but warn once per file
                    console.warn(`Skipping ${file.rel}: no Gemfile found in its ancestor directories.`);
                    continue;
                }
                const relFromRoot = path_1.default.relative(rubyRoot, file.abs);
                const diffLines = changedMap.get(file.rel) || new Set();
                const list = groups.get(rubyRoot) || [];
                list.push({ relFromRoot, abs: file.abs, relOriginal: file.rel, diffLines });
                groups.set(rubyRoot, list);
            }
            if (groups.size === 0) {
                console.log('No Ruby files with detectable Gemfile roots.');
                return;
            }
            console.log(`Detected ${groups.size} Ruby project root(s) for diff files.`);
            // Preview mode early output table
            const tableRows = [];
            tableRows.push('ROOT | FILES | CHANGED LINES');
            tableRows.push('-----|-------|---------------');
            for (const [root, files] of groups.entries()) {
                const changedLinesTotal = files.reduce((acc, f) => acc + f.diffLines.size, 0);
                tableRows.push(`${root} | ${files.length} | ${changedLinesTotal}`);
                if (opts.preview) {
                    files.forEach(f => {
                        console.log(`  • ${f.relFromRoot} (${f.diffLines.size} changed)`);
                    });
                }
            }
            console.log('\nSummary:');
            for (const row of tableRows)
                console.log(row);
            console.log('');
            if (opts.preview) {
                console.log('Preview mode enabled; skipping RuboCop execution.');
                return;
            }
            for (const [root, files] of groups.entries()) {
                // Bundler install check
                try {
                    (0, child_process_1.execSync)(`cd ${root} && bundle check`, { stdio: 'ignore' });
                }
                catch {
                    console.warn(`⚠ Dependencies not installed for root ${root}. Run: (cd ${root} && bundle install)`);
                }
                console.log(`➡ Running RuboCop in root: ${root} (${files.length} file(s))`);
                // Capture original contents
                for (const info of files) {
                    if (await fs_extra_1.default.pathExists(info.abs)) {
                        info.originalContent = (await fs_extra_1.default.readFile(info.abs, 'utf-8')).split('\n');
                    }
                }
                const fileArgs = files.map(f => '"' + f.relFromRoot + '"').join(' ');
                try {
                    (0, child_process_1.execSync)(`cd ${root} && bundle exec rubocop -A ${fileArgs}`, { stdio: 'inherit' });
                }
                catch (e) {
                    console.log('RuboCop finished with non-zero exit code in root', root);
                }
                // Merge back only changed lines modifications
                for (const info of files) {
                    if (!info.originalContent)
                        continue;
                    if (!await fs_extra_1.default.pathExists(info.abs))
                        continue;
                    const newContent = (await fs_extra_1.default.readFile(info.abs, 'utf-8')).split('\n');
                    const orig = info.originalContent;
                    // Restore lines not in diff set
                    for (let i = 0; i < Math.max(orig.length, newContent.length); i++) {
                        const lineNum = i + 1;
                        if (!info.diffLines.has(lineNum)) {
                            if (orig[i] !== undefined)
                                newContent[i] = orig[i];
                        }
                    }
                    await fs_extra_1.default.writeFile(info.abs, newContent.join('\n'));
                }
                // After merging, run rubocop in check mode to report remaining offenses for these files
                try {
                    console.log(`Running RuboCop check in ${root} to verify remaining offenses...`);
                    const checkCmd = `cd ${root} && bundle exec rubocop ${fileArgs}`;
                    const checkOutput = (0, child_process_1.execSync)(checkCmd, { encoding: 'utf-8' });
                    // If rubocop exits 0, no offenses
                    console.log(`✅ RuboCop check passed for root ${root} (no offenses for selected files).`);
                }
                catch (err) {
                    // rubocop returns non-zero when offenses remain; print output
                    const msg = err.stdout || err.stderr || (err.message ? err.message : 'Unknown error');
                    console.log(`⚠ RuboCop found remaining offenses in root ${root}:`);
                    console.log(msg.trim());
                }
            }
            console.log('RuboCop auto-correct applied per root; non-diff lines restored.');
        }
        catch (err) {
            console.warn('Failed multi-root rubocop auto-correct:', err.message);
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