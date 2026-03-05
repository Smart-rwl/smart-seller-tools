import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');
const folders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // 1. Remove any accidental 'Page' function inside ToolClient.tsx
    // This is likely what is causing the "Property 'slug' is missing" error at the Page level
    content = content.replace(/export\s+default\s+async\s+function\s+Page[\s\S]*?{[\s\S]*?return\s+<ToolClient\s*\/>;?\s*}/g, "");
    content = content.replace(/export\s+default\s+function\s+Page[\s\S]*?{[\s\S]*?return\s+<ToolClient\s*\/>;?\s*}/g, "");

    // 2. Ensure the main ToolClient function accepts the slug
    // Standard function fix
    let updatedContent = content.replace(
      /export\s+default\s+function\s+ToolClient\s*\(\s*\)/, 
      "export default function ToolClient({ slug }: { slug: string })"
    );

    // Arrow function fix
    updatedContent = updatedContent.replace(
      /const\s+ToolClient\s*=\s*\(\s*\)\s*=>/, 
      "const ToolClient = ({ slug }: { slug: string }) =>"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`✅ Aligned props for: ${folder}`);
    }
  }
});