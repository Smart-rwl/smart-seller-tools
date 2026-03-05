import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');
const folders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // 1. Remove the redundant Page function block entirely
    content = content.replace(/export\s+default\s+function\s+Page[\s\S]*?{[\s\S]*?return\s+<ToolClient\s*\/>;?\s*}/g, "");
    content = content.replace(/export\s+default\s+async\s+function\s+Page[\s\S]*?{[\s\S]*?return\s+<ToolClient\s*\/>;?\s*}/g, "");

    // 2. Ensure ToolClient is exported and accepts the slug prop
    // Find the ToolClient function and inject the props
    let updatedContent = content.replace(
      /(export\s+default\s+function\s+ToolClient)\s*\(\s*\)/, 
      "$1({ slug }: { slug: string })"
    );

    // Handle arrow functions just in case
    updatedContent = updatedContent.replace(
      /(const\s+ToolClient\s*=\s*)\(\s*\)\s*=>/, 
      "$1({ slug }: { slug: string }) =>"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`✅ Cleaned up: ${folder}`);
    }
  }
});