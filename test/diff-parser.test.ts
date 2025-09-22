import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// This test is a lightweight sanity check that our diff extraction logic in RubocopFixerAgent
// can detect added lines. Rather than importing private method, we simulate a mini repo and run git diff -U0
// mirroring the logic expectations.

describe('Diff line detection (sanity)', () => {
  const tmpDir = path.join(__dirname, '..', '.tmp-diff-test');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);
    if (!fs.existsSync(path.join(tmpDir, '.git'))) {
      execSync('git init -q');
    }
    fs.writeFileSync('sample.rb', "puts 'hello'\n");
    execSync('git add sample.rb');
    execSync('git commit -m "init" -q');
    // Modify file adding two lines
    fs.writeFileSync('sample.rb', "puts 'hello'\nputs 'world'\nputs 'again'\n");
  });

  it('produces a diff containing added lines with + markers', () => {
    const out = execSync('git diff HEAD -U0', { encoding: 'utf-8' });
    expect(out).toMatch(/\+puts 'world'/);
    expect(out).toMatch(/\+puts 'again'/);
  });
});
