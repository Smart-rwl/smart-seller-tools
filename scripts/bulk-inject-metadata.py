import os
import re

TOOLS_DIR = "app/tools"

def get_category(folder_name):
    name = folder_name.lower()
    if any(k in name for k in ["image","img","photo","dwn"]):
        return "Image Tools"
    if any(k in name for k in ["fee","price","calc","profit"]):
        return "Financial Tools"
    if any(k in name for k in ["keyword","seo","rank","search"]):
        return "SEO & Marketing"
    if any(k in name for k in ["track","status","ship","order"]):
        return "Order Management"
    return "Utilities"

def get_smart_title(content, folder_name):
    match = re.search(r'title="([^"]+)"', content)
    if match:
        return match.group(1)
    return folder_name.replace("-", " ").title()

def inject_metadata():

    if not os.path.exists(TOOLS_DIR):
        print("[ERROR] Tools directory not found.")
        return

    for folder in os.listdir(TOOLS_DIR):

        folder_path = os.path.join(TOOLS_DIR, folder)
        tsx_path = os.path.join(folder_path, "page.tsx")

        if not os.path.isdir(folder_path) or not os.path.exists(tsx_path):
            continue

        with open(tsx_path, "r", encoding="utf-8") as f:
            content = f.read()

        # rename metadata
        if "export const metadata =" in content:
            new_content = content.replace(
                "export const metadata =",
                "export const toolConfig =",
                1
            )

            if new_content != content:
                with open(tsx_path, "w", encoding="utf-8") as f:
                    f.write(new_content)

            print(f"[FIX] Renamed metadata → toolConfig in {folder}")
            continue

        # skip existing configs
        if "export const toolConfig =" in content:
            continue

        title = get_smart_title(content, folder)
        category = get_category(folder)

        platform = "General"
        if "amazon" in folder.lower():
            platform = "Amazon"
        elif "flipkart" in folder.lower():
            platform = "Flipkart"

        config_block = f"""
/**
 * CONFIG FOR AUTOMATION
 */
export const toolConfig = {{
  title: "{title}",
  description: "Automated tool for {title}.",
  version: "1.0.0",
  status: "Stable",
  category: "{category}",
  platform: "{platform}"
}};
"""

        if "'use client'" in content:
            new_content = content.replace("'use client';", "'use client';\n" + config_block, 1)
        else:
            new_content = config_block + content

        with open(tsx_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        print(f"[ADD] Injected toolConfig into {folder}")

if __name__ == "__main__":
    inject_metadata()