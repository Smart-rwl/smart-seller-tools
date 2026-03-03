import os
import re

TOOLS_DIR = "app/tools"

def get_smart_title(content, folder_name):
    # Try to find the title inside the ToolWorkspace component first
    title_match = re.search(r'title="([^"]+)"', content)
    if title_match:
        return title_match.group(1)
    # Fallback to formatting the folder name
    return folder_name.replace("-", " ").title()

def inject_metadata():
    if not os.path.exists(TOOLS_DIR):
        print(f"Error: {TOOLS_DIR} directory not found.")
        return

    for folder in os.listdir(TOOLS_DIR):
        folder_path = os.path.join(TOOLS_DIR, folder)
        tsx_path = os.path.join(folder_path, "page.tsx")
        
        if os.path.isdir(folder_path) and os.path.exists(tsx_path):
            with open(tsx_path, "r") as f:
                content = f.read()
            
            # Skip files that already have metadata to prevent double injection
            if "export const metadata =" in content:
                print(f"Skipping {folder}: Metadata already present.")
                continue
            
            title = get_smart_title(content, folder)
            
            # Smart Platform detection
            platform = "General"
            lower_folder = folder.lower()
            if "amazon" in lower_folder: platform = "Amazon"
            elif "flipkart" in lower_folder: platform = "Flipkart"
            elif "meesho" in lower_folder: platform = "Meesho"
            elif "myntra" in lower_folder: platform = "Myntra"
            
            # Construct the metadata block
            metadata_block = (
                f"/**\n * METADATA FOR AUTOMATION\n */\n"
                f"export const metadata = {{\n"
                f"  title: \"{title}\",\n"
                f"  description: \"Automated tool for {title}.\",\n"
                f"  version: \"1.0.0\",\n"
                f"  status: \"Stable\",\n"
                f"  platform: \"{platform}\"\n"
                f"}};\n\n"
            )
            
            # Find the best place to insert (after 'use client')
            if "'use client'" in content or '"use client"' in content:
                new_content = content.replace("'use client';", f"'use client';\n\n{metadata_block}", 1)
                new_content = new_content.replace('"use client";', f'"use client";\n\n{metadata_block}", 1)
            else:
                new_content = metadata_block + content
            
            with open(tsx_path, "w") as f:
                f.write(new_content)
            print(f"✅ Successfully injected metadata into {folder}")

if __name__ == "__main__":
    inject_metadata()
