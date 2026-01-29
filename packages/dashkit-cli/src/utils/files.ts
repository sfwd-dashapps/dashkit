import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplatesDir(): string {
  // From src/utils/ to templates/
  return path.join(__dirname, '..', '..', 'templates');
}

export async function ensureDirectories(targetDir: string): Promise<void> {
  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  await fs.ensureDir(claudeAgentsDir);
  await fs.ensureDir(githubAgentsDir);
}

export async function copyAgentFiles(
  targetDir: string,
  options: { force: boolean }
): Promise<number> {
  const { force } = options;
  const templateDir = getTemplatesDir();

  const claudeTemplates = path.join(templateDir, '.claude', 'agents');
  const githubTemplates = path.join(templateDir, '.github', 'agents');

  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  // Ensure directories exist
  await ensureDirectories(targetDir);

  // Check for existing files if not forcing
  if (!force) {
    const existingFiles = [];

    // Check Claude agent files
    const claudeFiles = await fs.readdir(claudeTemplates);
    for (const file of claudeFiles) {
      if (await fs.pathExists(path.join(claudeAgentsDir, file))) {
        existingFiles.push(path.join('.claude', 'agents', file));
      }
    }

    // Check GitHub agent files
    const githubFiles = await fs.readdir(githubTemplates);
    for (const file of githubFiles) {
      if (await fs.pathExists(path.join(githubAgentsDir, file))) {
        existingFiles.push(path.join('.github', 'agents', file));
      }
    }

    if (existingFiles.length > 0) {
      throw new Error(
        `Files already exist: ${existingFiles.join(', ')}. Use --force to overwrite.`
      );
    }
  }

  // Copy files
  await fs.copy(claudeTemplates, claudeAgentsDir, {
    overwrite: force,
    errorOnExist: !force,
  });

  await fs.copy(githubTemplates, githubAgentsDir, {
    overwrite: force,
    errorOnExist: !force,
  });

  // Count files copied
  const claudeFileCount = (await fs.readdir(claudeAgentsDir)).length;
  const githubFileCount = (await fs.readdir(githubAgentsDir)).length;

  return claudeFileCount + githubFileCount;
}

export async function listAgentFiles(targetDir: string): Promise<string[]> {
  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  const files: string[] = [];

  if (await fs.pathExists(claudeAgentsDir)) {
    const claudeFiles = await fs.readdir(claudeAgentsDir);
    files.push(...claudeFiles.map(f => path.join('.claude', 'agents', f)));
  }

  if (await fs.pathExists(githubAgentsDir)) {
    const githubFiles = await fs.readdir(githubAgentsDir);
    files.push(...githubFiles.map(f => path.join('.github', 'agents', f)));
  }

  return files;
}
