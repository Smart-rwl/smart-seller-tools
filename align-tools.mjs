import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');
const folders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // 1. Remove the redundant Page function that is missing the prop
    content = content.replace(/export\s+default\s+function\s+Page[\s\S]*?{[\s\S]*?return\s+<ToolClient\s*\/>;?\s*}/g, "");
    
    // 2. Fix the ToolClient function signature to accept { slug }
    let updatedContent = content.replace(
      /export\s+default\s+function\s+ToolClient\s*\(\s*\)/, 
      "export default function ToolClient({ slug }: { slug: string })"
    );

    // Also handle Arrow Functions just in case
    updatedContent = updatedContent.replace(
      /const\s+ToolClient\s*=\s*\(\s*\)\s*=>/, 
      "const ToolClient = ({ slug }: { slug: string }) =>"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`✅ Aligned: ${folder}`);
    }
  }
});