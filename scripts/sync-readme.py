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
        # fetch-depth: 0 in the workflow allows this to access full history
        result = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", file_path],
            stderr=subprocess.STDOUT
        ).decode("utf-8").strip()
        return result if result else datetime.now().strftime("%Y-%m-%d")
    except Exception:
        # Fallback to current date if Git log fails (e.g., new uncommitted file)
        return datetime.now().strftime("%Y-%m-%d")

def extract_metadata(tool_path):
    tsx_path = os.path.join(tool_path, "page.tsx")
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
            # Updated patterns to look for 'toolConfig'
            patterns = {
                "description": r'description:\s*["\'](.*?)["\']',
                "version": r'version:\s*["\'](.*?)["\']',
                "status": r'status:\s*["\'](.*?)["\']',
                "platform": r'platform:\s*["\'](.*?)["\']',
                "category": r'category:\s*["\'](.*?)["\']'
            }
            for key, pattern in patterns.items():
                match = re.search(pattern, content)
                if match:
                    data[key] = match.group(1)
            
    return data
    
def generate_badges(tools_data):
    """Generates dynamic project-wide badges for the top of the README."""
    total = len(tools_data)
    stable = len([t for t in tools_data if t.get('status') == 'Stable'])
    date_now = datetime.now().strftime('%Y--%m--%d')
    
    # Replace 'smart-seller-tools' with your actual Vercel project name if different
    vercel_status = "![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=smart-seller-tools)"
    
    badges = [
        f"![Total Tools](https://img.shields.io/badge/Total_Tools-{total}-blue)",
        vercel_status,
        f"![Last Sync](https://img.shields.io/badge/Last_Sync-{date_now}-orange)",
        f"![Maintained](https://img.shields.io/badge/Maintained%20by-github--actions-ff69b4)"
    ]
    return " ".join(badges) + "\n"

def generate_tools_table(tools_data):
    """Builds a single master table for all 40+ tools sorted by category."""
    # Master Table Header
    table_md = "| Status | Category | Platform | Tool Name | Description | Version | Last Updated | Live Demo |\n"
    table_md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
    
    status_emojis = {
        "Stable": "✅", 
        "Beta": "🧪", 
        "Planned": "📅",
        "Deprecated": "⚠️"
    }

    # Platform badge colors
    platform_colors = {
        "Amazon": "FF9900", 
        "Flipkart": "2874F0", 
        "Meesho": "F43397", 
        "Myntra": "FF3F6C", 
        "General": "607D8B"
    }

    # Sort tools: First by Category, then by Name
    sorted_tools = sorted(tools_data, key=lambda x: (x.get('category', 'Utilities'), x['name']))

    for tool in sorted_tools:
        emoji = status_emojis.get(tool['status'], "✅")
        
        # Platform Badge
        p_name = tool.get('platform', 'General')
        p_color = platform_colors.get(p_name, "607D8B")
        p_badge = f"![{p_name}](https://img.shields.io/badge/-{p_name}-{p_color}?style=flat-square)"
        
        # Vercel Live Link
        # Replace 'smart-seller-tools.vercel.app' with your actual production domain
        vercel_link = f"https://smart-seller-tools.vercel.app/tools/{tool['slug']}"
        deploy_badge = f"[![Live](https://img.shields.io/badge/Vercel-Live-black?style=flat&logo=vercel)]({vercel_link})"
        
        # Add a row to the master table
        table_md += (
            f"| {emoji} | **{tool.get('category', 'Utilities')}** | {p_badge} | "
            f"[{tool['name']}](./app/tools/{tool['slug']}) | "
            f"{tool['description']} | `v{tool['version']}` | {tool.get('last_mod', 'N/A')} | {deploy_badge} |\n"
        )
        
    return table_md

def update_changelog(tool_name, new_version):
    """Appends version bumps to CHANGELOG.md automatically."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    entry = f"## [{new_version}] - {date_str}\n* **{tool_name}**: Auto-detected version bump to {new_version}\n\n"
    
    existing_content = ""
    if os.path.exists(CHANGELOG_PATH):
        with open(CHANGELOG_PATH, "r") as f:
            existing_content = f.read()
            
    # Avoid duplicate entries for the same version
    if entry not in existing_content:
        with open(CHANGELOG_PATH, "w") as f:
            f.write(entry + existing_content)

def update_docs():
    """Main execution logic to update README.md and CHANGELOG.md."""
    if not os.path.exists(README_PATH):
        print("README.md not found!")
        return

    all_tools = []
    if not os.path.exists(TOOLS_DIR):
        print(f"Directory {TOOLS_DIR} not found!")
        return

    # Identify all individual tool directories
    folders = [d for d in os.listdir(TOOLS_DIR) 
               if os.path.isdir(os.path.join(TOOLS_DIR, d)) and not d.startswith("[")]
    
    for folder in folders:
        meta = extract_metadata(os.path.join(TOOLS_DIR, folder))
        all_tools.append({
            "slug": folder,
            "name": folder.replace("-", " ").title(),
            **meta
        })

    # Read existing README to check for version changes
    with open(README_PATH, "r") as f:
        old_content = f.read()

    # Trigger changelog update if version string (e.g., `v1.2.0`) isn't in current README
    for tool in all_tools:
        version_marker = f"`v{tool['version']}`"
        if version_marker not in old_content:
            update_changelog(tool['name'], tool['version'])

    # Assemble the new README content using placeholder tags
    new_content = old_content

    if "" in new_content:
        start = new_content.find("") + len("")
        end = new_content.find("")
        new_content = new_content[:start] + "\n" + generate_badges(all_tools) + new_content[end:]

    if "" in new_content:
        start = new_content.find("") + len("")
        end = new_content.find("")
        new_content = new_content[:start] + "\n\n" + generate_tools_table(all_tools) + "\n" + new_content[end:]
        
    # Write the final result back to README.md
    with open(README_PATH, "w") as f:
        f.write(new_content)
    print("Documentation sync successful.")

if __name__ == "__main__":
    update_docs()
