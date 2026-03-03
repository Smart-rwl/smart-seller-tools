import os
import json
from datetime import datetime

# Configuration
TOOLS_DIR = "app/tools"
README_PATH = "README.md"
CHANGELOG_PATH = "CHANGELOG.md"

def get_tool_metadata(tool_path):
    """Reads metadata.json from a tool folder or returns defaults."""
    meta_file = os.path.join(tool_path, "metadata.json")
    if os.path.exists(meta_file):
        with open(meta_file, "r") as f:
            return json.load(f)
    return {
        "description": "React-based seller tool.",
        "version": "1.0.0",
        "status": "Stable"
    }

def generate_badges(tools_data):
    """Generates Shields.io badges based on current tool stats."""
    total = len(tools_data)
    stable = len([t for t in tools_data if t.get('status') == 'Stable'])
    
    badges = [
        f"![Total Tools](https://img.shields.io/badge/Total_Tools-{total}-blue)",
        f"![Stable](https://img.shields.io/badge/Stable_Tools-{stable}-success)",
        f"![Maintained](https://img.shields.io/badge/Maintained%20by-github--actions-orange)"
    ]
    return " ".join(badges) + "\n"

def generate_tools_table(tools_data):
    """Creates a Markdown table for the README."""
    table_md = "| Status | Tool Name | Description | Version | Link |\n"
    table_md += "| :--- | :--- | :--- | :--- | :--- |\n"
    
    status_emojis = {
        "Stable": "✅",
        "Beta": "🧪",
        "Planned": "📅",
        "Deprecated": "⚠️"
    }
    
    for tool in sorted(tools_data, key=lambda x: x['name']):
        emoji = status_emojis.get(tool['status'], "✅")
        table_md += (
            f"| {emoji} {tool['status']} | "
            f"**{tool['name']}** | "
            f"{tool['description']} | "
            f"`v{tool['version']}` | "
            f"[Open](./app/tools/{tool['slug']}) |\n"
        )
    return table_md

def update_changelog(tool_name, new_version):
    """Appends a new entry to CHANGELOG.md if a version bump is detected."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    entry = f"## [{new_version}] - {date_str}\n* **{tool_name}**: updated to version {new_version}\n\n"
    
    existing_content = ""
    if os.path.exists(CHANGELOG_PATH):
        with open(CHANGELOG_PATH, "r") as f:
            existing_content = f.read()
    
    if entry not in existing_content:
        with open(CHANGELOG_PATH, "w") as f:
            f.write(entry + existing_content)

def update_docs():
    """Main function to update README and Changelog."""
    if not os.path.exists(README_PATH):
        print("README.md not found!")
        return

    # 1. Collect all tools from app/tools/
    all_tools = []
    if not os.path.exists(TOOLS_DIR):
        print(f"Directory {TOOLS_DIR} not found!")
        return

    folders = [d for d in os.listdir(TOOLS_DIR) 
               if os.path.isdir(os.path.join(TOOLS_DIR, d)) and not d.startswith("[")]
    
    for folder in folders:
        meta = get_tool_metadata(os.path.join(TOOLS_DIR, folder))
        all_tools.append({
            "slug": folder,
            "name": folder.replace("-", " ").title(),
            "description": meta.get("description", "No description"),
            "version": meta.get("version", "1.0.0"),
            "status": meta.get("status", "Stable")
        })

    # 2. Read existing README for version comparison
    with open(README_PATH, "r") as f:
        old_content = f.read()

    # 3. Check for version bumps
    for tool in all_tools:
        version_marker = f"`v{tool['version']}`"
        if version_marker not in old_content:
            update_changelog(tool['name'], tool['version'])

    # 4. Inject Content into Placeholders
    new_content = old_content

    # Inject Badges
    if "" in new_content:
        start = new_content.find("") + len("")
        end = new_content.find("")
        new_content = new_content[:start] + "\n" + generate_badges(all_tools) + new_content[end:]

    # Inject Table
    if "" in new_content:
        start = new_content.find("") + len("")
        end = new_content.find("")
        new_content = new_content[:start] + "\n\n" + generate_tools_table(all_tools) + "\n" + new_content[end:]
        
    # 5. Save final README
    with open(README_PATH, "w") as f:
        f.write(new_content)
    print("Documentation sync complete.")

if __name__ == "__main__":
    update_docs()
