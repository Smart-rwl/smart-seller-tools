import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');
const folders = fs.readdirSync(toolsDir).filter(f => fs.statSync(path.join(toolsDir, f)).isDirectory());

folders.forEach(folder => {
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(clientPath)) {
    let content = fs.readFileSync(clientPath, 'utf8');

    // This regex is much more aggressive. 
    // It looks for 'export default function' followed by ANY name and then empty parentheses ()
    const updatedContent = content.replace(
      /(export\s+default\s+function\s+\w+)\s*\(\s*\)/,
      "$1({ slug }: { slug: string })"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(clientPath, updatedContent);
      console.log(`🚀 Successfully updated: ${folder}`);
    } else {
      // If it's an arrow function: export default const Name = () =>
      const arrowContent = content.replace(
        /(export\s+default\s+(?:const|let|var)\s+\w+\s*=\s*)\(\s*\)\s*=>/,
        "$1({ slug }: { slug: string }) =>"
      );
      
      if (content !== arrowContent) {
        fs.writeFileSync(clientPath, arrowContent);
        console.log(`🚀 Updated Arrow Function: ${folder}`);
      } else {
        console.log(`❌ Still failing to find signature in: ${folder}`);
      }
    }
  }
});