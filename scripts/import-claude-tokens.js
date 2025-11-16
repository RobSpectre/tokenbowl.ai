#!/usr/bin/env node

/**
 * Import Claude's token picks from GregBaugues/tokenbowl-mcp repository
 *
 * This script:
 * 1. Clones or updates the tokenbowl-mcp repository
 * 2. Finds all Claude's pick files from /picks/ directory
 * 3. Combines relevant files per week
 * 4. Outputs them to /public/matchups/ with naming: week_{N}_Claude.md
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://github.com/GregBaugues/tokenbowl-mcp.git';
const REPO_DIR = path.join('/tmp', 'tokenbowl-mcp');
const SOURCE_DIR = path.join(REPO_DIR, 'picks');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'matchups');

console.log('🏈 Token Bowl - Claude Picks Import Script\n');

// Clone or update the repository
function cloneOrUpdateRepo() {
  console.log('📦 Fetching source repository...');

  if (fs.existsSync(REPO_DIR)) {
    console.log('   Repository exists, updating...');
    try {
      execSync('git pull', { cwd: REPO_DIR, stdio: 'inherit' });
    } catch (error) {
      console.log('   Failed to update, removing and re-cloning...');
      fs.rmSync(REPO_DIR, { recursive: true, force: true });
      execSync(`git clone ${REPO_URL} ${REPO_DIR}`, { stdio: 'inherit' });
    }
  } else {
    console.log('   Cloning repository...');
    execSync(`git clone ${REPO_URL} ${REPO_DIR}`, { stdio: 'inherit' });
  }

  console.log('   ✓ Repository ready\n');
}

// Get all week directories
function getWeekDirectories() {
  const entries = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('week'))
    .map(entry => ({
      name: entry.name,
      path: path.join(SOURCE_DIR, entry.name),
      weekNumber: parseInt(entry.name.replace('week', ''))
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber);
}

// Combine files from a week directory
function combineWeekFiles(weekDir) {
  const files = fs.readdirSync(weekDir.path);

  // Priority order for files to include
  const filePatterns = [
    // For week 1, use specific files
    weekDir.weekNumber === 1 ? [
      'waivers.md',
      'startsit_results.md',
      'sunday_start_sit.md'
    ] : null,

    // For other weeks, use standard pattern
    weekDir.weekNumber !== 1 ? [
      `waivers_week${weekDir.weekNumber}.md`,
      // For week 6, prefer CORRECTED version
      weekDir.weekNumber === 6 ? `startsit_week${weekDir.weekNumber}_CORRECTED.md` : null,
      `startsit_week${weekDir.weekNumber}_updated.md`,
      `startsit_week${weekDir.weekNumber}.md`
    ].filter(Boolean) : null
  ].filter(Boolean).flat();

  let content = `# Week ${weekDir.weekNumber} - Claude (Bill Beliclaude) Token Picks\n\n`;
  content += `*Automated fantasy football decisions from Claude AI*\n\n`;
  content += `---\n\n`;

  const includedFiles = [];

  for (const pattern of filePatterns) {
    if (files.includes(pattern)) {
      const filePath = path.join(weekDir.path, pattern);
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Determine section title
      let sectionTitle = '';
      if (pattern.includes('waiver')) {
        sectionTitle = 'Waiver Wire Decisions';
      } else if (pattern.includes('startsit')) {
        sectionTitle = 'Start/Sit Analysis';
      } else if (pattern.includes('sunday')) {
        sectionTitle = 'Sunday Start/Sit Updates';
      }

      content += `## ${sectionTitle}\n\n`;
      content += fileContent;
      content += `\n\n---\n\n`;

      includedFiles.push(pattern);
    }
  }

  if (includedFiles.length === 0) {
    console.log(`   ⚠️  No files found for week ${weekDir.weekNumber}`);
    return null;
  }

  console.log(`   ✓ Week ${weekDir.weekNumber}: Combined ${includedFiles.length} file(s)`);
  return content;
}

// Main execution
function main() {
  try {
    // Step 1: Clone/update repository
    cloneOrUpdateRepo();

    // Step 2: Get week directories
    console.log('📂 Finding week directories...');
    const weekDirs = getWeekDirectories();
    console.log(`   Found ${weekDirs.length} week(s): ${weekDirs.map(w => w.name).join(', ')}\n`);

    // Step 3: Process each week
    console.log('📝 Processing weeks...');
    let successCount = 0;
    let skipCount = 0;

    for (const weekDir of weekDirs) {
      const combined = combineWeekFiles(weekDir);

      if (combined) {
        const targetFile = path.join(TARGET_DIR, `week_${weekDir.weekNumber}_Claude.md`);
        fs.writeFileSync(targetFile, combined, 'utf-8');
        successCount++;
      } else {
        skipCount++;
      }
    }

    console.log('\n✅ Import complete!');
    console.log(`   ${successCount} week(s) imported`);
    if (skipCount > 0) {
      console.log(`   ${skipCount} week(s) skipped (no files found)`);
    }
    console.log(`\n📁 Files written to: ${TARGET_DIR}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
