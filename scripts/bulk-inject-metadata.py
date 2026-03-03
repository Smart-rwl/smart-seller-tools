import os

TOOLS_DIR = "app/tools"

# The metadata template to be injected
METADATA_TEMPLATE = """/**
 * METADATA FOR AUTOMATION
 */
export const metadata = {{
  title: "{title}",
  description: "{description}",
  version: "1.0.0",
  status: "Stable",
  platform: "{platform}"
}};

"""

def inject_metadata():
    for folder in os.listdir(TOOLS_DIR):
        folder_path = os.path.join(TOOLS_DIR, folder)
        tsx_path = os.path.join(folder_path, "page.tsx")
        
        if os.path.isdir(folder_path) and os.path.exists(tsx_path):
            with open(tsx_path, "r") as f:
                content = f.read()
            
            # Skip if metadata already exists
            if "export const metadata =" in content:
                print(f"Skipping {folder}: Metadata already exists.")
                continue
            
            # Logic to guess platform and title from folder name
            title = folder.replace("-", " ").title()
            platform = "General"
            if "amazon" in folder.lower(): platform = "Amazon"
            elif "flipkart" in folder.lower(): platform = "Flipkart"
            elif "meesho" in folder.lower(): platform = "Meesho"
            
            # Prepend metadata to the file content
            new_content = METADATA_TEMPLATE.format(
                title=title, 
                description=f"Automated tool for {title}.", 
                platform=platform
            ) + content
            
            with open(tsx_path, "w") as f:
                f.write(new_content)
            print(f"Injected metadata into {folder}")

if __name__ == "__main__":
    inject_metadata()
