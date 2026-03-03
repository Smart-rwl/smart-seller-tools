import os

# Define where your tools are located
TOOLS_DIR = "./src" # Change this to the folder containing your tools
README_PATH = "README.md"

def generate_tools_list():
    tools = [d for d in os.listdir(TOOLS_DIR) if os.path.isdir(os.path.join(TOOLS_DIR, d))]
    list_md = "### 🛠 Available Tools\n\n"
    for tool in sorted(tools):
        # Format the folder name (e.g., 'amazon-image-tool' -> 'Amazon Image Tool')
        display_name = tool.replace("-", " ").title()
        list_md += f"* **{display_name}**: [View Code](./src/{tool})\n"
    return list_md

def update_readme():
    with open(README_PATH, "r") as f:
        content = f.read()

    start_tag = ""
    end_tag = ""
    
    start_index = content.find(start_tag) + len(start_tag)
    end_index = content.find(end_tag)

    if start_index != -1 and end_index != -1:
        new_tools_list = "\n\n" + generate_tools_list() + "\n"
        new_content = content[:start_index] + new_tools_list + content[end_index:]
        
        with open(README_PATH, "w") as f:
            f.write(new_content)

if __name__ == "__main__":
    update_readme()
