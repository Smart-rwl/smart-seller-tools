import os
import json

# Configuration
TOOLS_DIR = "app/tools"
README_PATH = "README.md"

def get_tool_metadata(tool_path):
    meta_file = os.path.join(tool_path, "metadata.json")
    if os.path.exists(meta_file):
        with open(meta_file, "r") as f:
            return json.load(f)
    return {"description": "React-based seller tool.", "version": "1.0.0", "status": "Stable"}

def generate_badges(tools_data):
    total = len(tools_data)
    stable = len([t for t in tools_data if t.get('status') == 'Stable'])
    
    # Shields.io badges
    badges = [
        f"![Total Tools](https://img.shields.io/badge/Total_Tools-{total}-blue)",
        f"![Stable Tools](https://img.shields.io/badge/Stable_Tools-{stable}-success)",
        f"![Automated](https://img.shields.io/badge/Docs-Automated-orange)"
    ]
    return " ".join(badges) + "\n"

def generate_tools_table(tools_data):
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
        table_md += f"| {emoji} {tool['status']} | **{tool['name']}** | {tool['description']} | `v{tool['version']}` | [Open](./app/tools/{tool['slug']}) |\n"
    
    return table_md

def update_readme():
    if not os.path.exists(README_PATH):
        return

    # Collect data from all tool directories
    all_tools = []
    folders = [d for d in os.listdir(TOOLS_DIR) 
               if os.path.isdir(os.path.join(TOOLS_DIR, d)) and not d.startswith("[")]
    
    for folder in folders:
        meta = get_tool_metadata(os.path.join(TOOLS_DIR, folder))
        all_tools.append({
            "slug": folder,
            "name": folder.replace("-", " ").title(),
            "description": meta.get("description"),
            "version": meta.get("version"),
            "status": meta.get("status")
        })

    with open(README_PATH, "r") as f:
        content = f.read()

    # Inject Badges
    if "" in content:
        start = content.find("") + len("")
        end = content.find("")
        content = content[:start] + "\n" + generate_badges(all_tools) + content[end:]

    # Inject Table
    if "" in content:
        start = content.find("") + len("")
        end = content.find("")
        content = content[:start] + "\n\n" + generate_tools_table(all_tools) + "\n" + content[end:]
        
    with open(README_PATH, "w") as f:
        f.write(content)

if __name__ == "__main__":
    update_readme()
