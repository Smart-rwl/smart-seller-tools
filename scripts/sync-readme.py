import os
import json

TOOLS_DIR = "./src"
README_PATH = "README.md"

def get_tool_metadata(tool_path):
    # Try to find a JSON file with metadata
    meta_file = os.path.join(tool_path, "metadata.json")
    if os.path.exists(meta_file):
        with open(meta_file, "r") as f:
            return json.load(f)
    return {"description": "No description provided.", "version": "1.0.0"}

def generate_tools_list():
    tools = [d for d in os.listdir(TOOLS_DIR) if os.path.isdir(os.path.join(TOOLS_DIR, d))]
    
    # Create a Markdown Table for a professional look
    table_md = "| Tool Name | Description | Version | Link |\n"
    table_md += "| :--- | :--- | :--- | :--- |\n"
    
    for tool in sorted(tools):
        meta = get_tool_metadata(os.path.join(TOOLS_DIR, tool))
        display_name = tool.replace("-", " ").title()
        desc = meta.get("description", "No description")
        ver = meta.get("version", "1.0.0")
        
        table_md += f"| **{display_name}** | {desc} | `v{ver}` | [Explore](./src/{tool}) |\n"
    
    return table_md

def update_readme():
    with open(README_PATH, "r") as f:
        content = f.read()

    start_tag = ""
    end_tag = ""
    
    start_idx = content.find(start_tag) + len(start_tag)
    end_idx = content.find(end_tag)

    if start_idx != -1 and end_idx != -1:
        new_table = "\n\n" + generate_tools_list() + "\n"
        updated_content = content[:start_idx] + new_table + content[end_idx:]
        
        with open(README_PATH, "w") as f:
            f.write(updated_content)

if __name__ == "__main__":
    update_readme()
