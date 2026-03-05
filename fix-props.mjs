import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');

const folders = fs.readdirSync(toolsDir).filter(f => 
  fs.statSync(path.join(toolsDir, f)).isDirectory()
);

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // This regex looks for: export default function ToolClient()
    // and replaces it with: export default function ToolClient({ slug }: { slug: string })
    const updatedContent = content.replace(
      /export default function ToolClient\s*\(\s*\)/, 
      "export default function ToolClient({ slug }: { slug: string })"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`✅ Fixed Props for: ${folder}`);
    }
  }
});