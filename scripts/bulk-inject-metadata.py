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

def get_smart_title(content, folder_name):
    """Attempts to find the UI title used in the component."""
    title_match = re.search(r'title="([^"]+)"', content)
    if title_match:
        return title_match.group(1)
    return folder_name.replace("-", " ").title()

def inject_metadata():
    if not os.path.exists(TOOLS_DIR):
        print("Tools directory not found.")
        return

    for folder in os.listdir(TOOLS_DIR):
        folder_path = os.path.join(TOOLS_DIR, folder)
        tsx_path = os.path.join(folder_path, "page.tsx")
        
        if os.path.isdir(folder_path) and os.path.exists(tsx_path):
            with open(tsx_path, "r") as f:
                content = f.read()
            
            # CASE 1: Rename existing metadata to toolConfig to fix build error
            if "export const metadata =" in content:
                new_content = content.replace("export const metadata =", "export const toolConfig =", 1)
                with open(tsx_path, "w") as f:
                    f.write(new_content)
                print(f"🔄 Renamed metadata to toolConfig in {folder}")
                continue

            # CASE 2: Skip if toolConfig already exists
            if "export const toolConfig =" in content:
                continue
            
            # CASE 3: Inject fresh toolConfig
            title = get_smart_title(content, folder)
            category = get_category(folder)
            platform = "General"
            if "amazon" in folder.lower(): platform = "Amazon"
            elif "flipkart" in folder.lower(): platform = "Flipkart"
            
            config_block = (
                f"/**\n * CONFIG FOR AUTOMATION\n */\n"
                f"export const toolConfig = {{\n"
                f"  title: \"{title}\",\n"
                f"  description: \"Automated tool for {title}.\",\n"
                f"  version: \"1.0.0\",\n"
                f"  status: \"Stable\",\n"
                f"  category: \"{category}\",\n"
                f"  platform: \"{platform}\"\n"
                f"}};\n\n"
            )
            
            if "'use client'" in content:
                new_content = content.replace("'use client';", f"'use client';\n\n{config_block}", 1)
            else:
                new_content = config_block + content
                
            with open(tsx_path, "w") as f:
                f.write(new_content)
            print(f"✅ Injected toolConfig into {folder}")

if __name__ == "__main__":
    inject_metadata()
