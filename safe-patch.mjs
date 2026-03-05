import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');
const folders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // Skip if already has the prop to avoid double-patching
    if (content.includes('{ slug }')) {
        console.log(`- Skipping ${folder}: Already patched.`);
        return;
    }

    // Safely inject the prop into the function signature
    const updatedContent = content.replace(
      /export\s+default\s+function\s+(\w+)\s*\(\s*\)/,
      "export default function $1({ slug }: { slug: string })"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`✅ Patched: ${folder}`);
    } else {
      console.log(`⚠️  No standard function found in ${folder}. Check manually.`);
    }
  }
});