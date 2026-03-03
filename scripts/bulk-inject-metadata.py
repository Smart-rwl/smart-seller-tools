import os
import re

TOOLS_DIR = "app/tools"

def get_category(folder_name):
    """Guesses the category based on folder name keywords."""
    name = folder_name.lower()
    if any(k in name for k in ["image", "img", "photo", "dwn"]): return "Image Tools"
    if any(k in name for k in ["fee", "price", "calc", "profit"]): return "Financial Tools"
    if any(k in name for k in ["keyword", "seo", "rank", "search"]): return "SEO & Marketing"
    if any(k in name for k in ["track", "status", "ship", "order"]): return "Order Management"
    return "Utilities"

def inject_metadata():
    for folder in os.listdir(TOOLS_DIR):
        folder_path = os.path.join(TOOLS_DIR, folder)
        tsx_path = os.path.join(folder_path, "page.tsx")
        
        if os.path.isdir(folder_path) and os.path.exists(tsx_path):
            with open(tsx_path, "r") as f: content = f.read()
            
            if "export const metadata =" in content: continue
            
            title = folder.replace("-", " ").title()
            category = get_category(folder)
            
            platform = "General"
            if "amazon" in folder.lower(): platform = "Amazon"
            elif "flipkart" in folder.lower(): platform = "Flipkart"
            
            metadata_block = (
                f"export const metadata = {{\n"
                f"  title: \"{title}\",\n"
                f"  description: \"Automated tool for {title}.\",\n"
                f"  version: \"1.0.0\",\n"
                f"  status: \"Stable\",\n"
                f"  category: \"{category}\",\n" # Added Category
                f"  platform: \"{platform}\"\n"
                f"}};\n\n"
            )
            
            # Insert after 'use client'
            if "'use client'" in content:
                new_content = content.replace("'use client';", f"'use client';\n\n{metadata_block}", 1)
            else:
                new_content = metadata_block + content
                
            with open(tsx_path, "w") as f: f.write(new_content)
            print(f"✅ Categorized {folder} as {category}")

if __name__ == "__main__":
    inject_metadata()
