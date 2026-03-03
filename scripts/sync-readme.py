import os
import json

# Updated to match your specific structure
TOOLS_DIR = "app/tools"
README_PATH = "README.md"

def get_tool_metadata(tool_path):
    meta_file = os.path.join(tool_path, "metadata.json")
    if os.path.exists(meta_file):
        with open(meta_file, "r") as f:
            return json.load(f)
    # Default fallback if you haven't added the JSON yet
    return {"description": "React-based seller tool.", "version": "1.0.0"}
def generate_badges(tools_data):
    total = len(tools_data)
    stable = len([t for t in tools_data if t['status'] == 'Stable'])
    
    # Using Shields.io for professional-looking badges
    badges = [
        f"![Total Tools](https://img.shields.io/badge/Total_Tools-{total}-blue)",
        f"![Stable](https://img.shields.io/badge/Stable-{stable}-success)",
        f"![Status](https://img.shields.io/badge/Maintained%20by-github--actions-orange)"
    ]
    return " ".join(badges) + "\n\n"

def update_readme():
    # ... previous logic to read file and get tools_data ...
    
    # We'll add a new tag for badges: start_badge_tag = ""
    end_badge_tag = ""
    
    # [Insert logic to find tags and inject generate_badges result]

def generate_tools_list():
    tools = [d for d in os.listdir(TOOLS_DIR) 
             if os.path.isdir(os.path.join(TOOLS_DIR, d)) and not d.startswith("[")]
    
    table_md = "| Status | Tool Name | Description | Version | Link |\n"
    table_md += "| :--- | :--- | :--- | :--- | :--- |\n"
    
    # Emoji map based on status
    status_emojis = {
        "Stable": "✅",
        "Beta": "🧪",
        "Planned": "📅",
        "Deprecated": "⚠️"
    }
    
    for tool in sorted(tools):
        meta = get_tool_metadata(os.path.join(TOOLS_DIR, tool))
        display_name = tool.replace("-", " ").title()
        desc = meta.get("description", "No description")
        ver = meta.get("version", "1.0.0")
        status = meta.get("status", "Stable")
        
        emoji = status_emojis.get(status, "✅")
        
        table_md += f"| {emoji} {status} | **{display_name}** | {desc} | `v{ver}` | [Open](./app/tools/{tool}) |\n"
    
    return table_md
def update_readme():
    if not os.path.exists(README_PATH):
        print("README.md not found!")
        return

    with open(README_PATH, "r") as f:
        content = f.read()

    start_tag = ""
    end_tag = ""
    
    start_idx = content.find(start_tag)
    end_idx = content.find(end_tag)

    if start_idx != -1 and end_idx != -1:
        # Keep the tags and put the table in between
        new_content = (
            content[:start_idx + len(start_tag)] + 
            "\n\n" + generate_tools_list() + "\n" + 
            content[end_idx:]
        )
        
        with open(README_PATH, "w") as f:
            f.write(new_content)
            print("README updated successfully!")

if __name__ == "__main__":
    update_readme()
