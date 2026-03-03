import os
import re
import json
import subprocess
from datetime import datetime

# Configuration
TOOLS_DIR = "app/tools"
README_PATH = "README.md"
CHANGELOG_PATH = "CHANGELOG.md"

def get_last_modified(file_path):
    """Gets the last commit date for a specific file using Git."""
    try:
        result = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", file_path],
            stderr=subprocess.STDOUT
        ).decode("utf-8").strip()
        return result if result else datetime.now().strftime("%Y-%m-%d")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")

def extract_metadata(tool_path):
    """Extracts metadata object from page.tsx using Regex."""
    tsx_path = os.path.join(tool_path, "page.tsx")
    
    # Default values if keys are missing
    data = {
        "description": "React-based seller tool.",
        "version": "1.0.0",
        "status": "Stable",
        "platform": "General",
        "category": "Utilities"
    }
    
    if os.path.exists(tsx_path):
        with open(tsx_path, "r") as f:
            content = f.read()
            
            # This dictionary maps the metadata key to the search pattern
            patterns = {
                "description": r'description:\s*["\'](.*?)["\']',
                "version": r'version:\s*["\'](.*?)["\']',
                "status": r'status:\s*["\'](.*?)["\']',
                "platform": r'platform:\s*["\'](.*?)["\']',
                "category": r'category:\s*["\'](.*?)["\']' # <--- This is the new line
            }
            
            for key, pattern in patterns.items():
                match = re.search(pattern, content)
                if match:
                    data[key] = match.group(1)
        
        # Pull the last modified date from Git history
        data["last_mod"] = get_last_modified(tsx_path)
            
    return data

def generate_badges(tools_data):
    """Generates dynamic project-wide badges."""
    total = len(tools_data)
    stable = len([t for t in tools_data if t.get('status') == 'Stable'])
    date_now = datetime.now().strftime('%Y--%m--%d')
    
    badges = [
        f"![Total Tools](https://img.shields.io/badge/Total_Tools-{total}-blue)",
        f"![Stable](https://img.shields.io/badge/Stable_Tools-{stable}-success)",
        f"![Last Sync](https://img.shields.io/badge/Last_Sync-{date_now}-orange)"
    ]
    return " ".join(badges) + "\n"

def generate_tools_table(tools_data):
    """Creates a single master table for all 40+ tools."""
    # Table Header
    final_md = "| Status | Category | Platform | Tool Name | Description | Version |\n"
    final_md += "| :--- | :--- | :--- | :--- | :--- | :--- |\n"
    
    # Status Emojis for quick visual reference
    status_emojis = {
        "Stable": "✅", 
        "Beta": "🧪", 
        "Planned": "📅", 
        "Deprecated": "⚠️"
    }

    # Sort tools: First by Category, then by Name
    sorted_tools = sorted(tools_data, key=lambda x: (x.get('category', 'Utilities'), x['name']))

    for tool in sorted_tools:
        emoji = status_emojis.get(tool['status'], "✅")
        category = tool.get('category', 'Utilities')
        platform = tool.get('platform', 'General')
        
        # Row Construction
        final_md += (
            f"| {emoji} | **{category}** | {platform} | "
            f"[{tool['name']}](./app/tools/{tool['slug']}) | "
            f"{tool['description']} | `v{tool['version']}` |\n"
        )
        
    return final_md
    
    def update_changelog(tool_name, new_version):
    """Writes version bumps to CHANGELOG.md."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    entry = f"## [{new_version}] - {date_str}\n* **{tool_name}**: Auto-detected version bump to {new_version}\n\n"
    
    existing = ""
    if os.path.exists(CHANGELOG_PATH):
        with open(CHANGELOG_PATH, "r") as f:
            existing = f.read()
            
    if entry not in existing:
        with open(CHANGELOG_PATH, "w") as f:
            f.write(entry + existing)

def update_docs():
    """Execution logic to update files."""
    if not os.path.exists(README_PATH):
        return

    all_tools = []
    if not os.path.exists(TOOLS_DIR):
        return

    folders = [d for d in os.listdir(TOOLS_DIR) 
               if os.path.isdir(os.path.join(TOOLS_DIR, d)) and not d.startswith("[")]
    
    for folder in folders:
        meta = extract_metadata(os.path.join(TOOLS_DIR, folder))
        all_tools.append({
            "slug": folder,
            "name": folder.replace("-", " ").title(),
            **meta
        })

    with open(README_PATH, "r") as f:
        old_content = f.read()

    # Changelog logic: if version code is new, log it
    for tool in all_tools:
        if f"`v{tool['version']}`" not in old_content:
            update_changelog(tool['name'], tool['version'])

    # Final string assembly
    new_content = old_content
    if "" in new_content:
        start = new_content.find("") + len("")
        end = new_content.find("")
        new_content = new_content[:start] + "\n" + generate_badges(all_tools) + new_content[end:]

    if "" in new_content:
        start = new_content.find("") + len("")
        end = new_content.find("")
        new_content = new_content[:start] + "\n\n" + generate_tools_table(all_tools) + "\n" + new_content[end:]
        
    with open(README_PATH, "w") as f:
        f.write(new_content)

if __name__ == "__main__":
    update_docs()
