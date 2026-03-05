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

    // Case 1: Standard function declaration
    // Matches: export default function ToolClient()
    let updatedContent = content.replace(
      /export default function ToolClient\s*\(\s*\)/, 
      "export default function ToolClient({ slug }: { slug: string })"
    );

    // Case 2: Arrow function (if applicable)
    // Matches: const ToolClient = () =>
    updatedContent = updatedContent.replace(
      /const ToolClient\s*=\s*\(\s*\)\s*=>/, 
      "const ToolClient = ({ slug }: { slug: string }) =>"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`✅ Prop  signature fixed: ${folder}`);
    }
  }
});