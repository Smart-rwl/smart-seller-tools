import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');
const folders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // Skip if already updated
    if (content.includes('{ slug }: { slug: string }')) return;

    // This regex looks for 'function Name()' or 'const Name = ()'
    // and replaces it with the version that accepts the slug prop
    const updatedContent = content
      .replace(/function\s+(\w+)\s*\(\s*\)/, "function $1({ slug }: { slug: string })")
      .replace(/(const|let|var)\s+(\w+)\s*=\s*\(\s*\)\s*=>/, "$1 $2 = ({ slug }: { slug: string }) =>");

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`🚀 Repaired: ${folder}`);
    } else {
      console.log(`❌ Still missed: ${folder}. Please check the file content.`);
    }
  }
});