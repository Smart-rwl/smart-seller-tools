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

    // Skip if already updated to avoid breaking things
    if (content.includes("async function Page")) return;

    // 1. Extract the Metadata block
    const metadataMatch = content.match(/\/\*\*[\s\S]*?\*\/[\s\S]*?export const metadata = {[\s\S]*?};/);
    const metadataBlock = metadataMatch ? metadataMatch[0] : "";

    // 2. Prepare Client content: Clean up metadata and ensure 'use client'
    let clientContent = content.replace(/export const metadata = {[\s\S]*?};/, "");
    if (!clientContent.trim().startsWith("'use client'")) {
        clientContent = "'use client';\n" + clientContent;
    }

    // 3. Prepare the New Page content with Async Params for Next.js 15
    const newPageContent = `import ToolClient from './ToolClient';

${metadataBlock}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ToolClient slug={slug} />;
}`;

    // Write files
    fs.writeFileSync(clientPath, clientContent);
    fs.writeFileSync(pagePath, newPageContent);
    
    console.log(`✅ Fixed Dynamic Route: ${folder}`);
  }
});