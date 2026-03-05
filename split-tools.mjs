import fs from 'fs';
import path from 'path';

const toolsDir = path.join(process.cwd(), 'app/tools');

const folders = fs.readdirSync(toolsDir).filter(f => 
  fs.statSync(path.join(toolsDir, f)).isDirectory()
);

folders.forEach(folder => {
  const pagePath = path.join(toolsDir, folder, 'page.tsx');
  const clientPath = path.join(toolsDir, folder, 'ToolClient.tsx');

  if (fs.existsSync(pagePath)) {
    const content = fs.readFileSync(pagePath, 'utf8');

    // Check if it's already split to avoid double-processing
    if (content.includes("import ToolClient from './ToolClient'")) return;

    // 1. Extract the Metadata block for the Bot
    const metadataMatch = content.match(/\/\*\*[\s\S]*?\*\/[\s\S]*?export const metadata = {[\s\S]*?};/);
    const metadataBlock = metadataMatch ? metadataMatch[0] : "";

    // 2. Prepare the Client content (The Logic)
    // We keep everything but remove the metadata export to avoid the error
    let clientContent = content.replace(/export const metadata = {[\s\S]*?};/, "");
    if (!clientContent.trim().startsWith("'use client'")) {
        clientContent = "'use client';\n" + clientContent;
    }

    // 3. Prepare the new Page content (The Entry Point)
    const newPageContent = `import ToolClient from './ToolClient';

${metadataBlock}

export default function Page() {
  return <ToolClient />;
}`;

    // Write the files
    fs.writeFileSync(clientPath, clientContent);
    fs.writeFileSync(pagePath, newPageContent);
    
    console.log(`✅ Processed: ${folder}`);
  }
});
