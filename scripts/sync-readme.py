import os
import re
import subprocess
from datetime import datetime

# Paths
TOOLS_DIR = "app/tools"
README_PATH = "README.md"
CHANGELOG_PATH = "CHANGELOG.md"

# README placeholder markers
BADGES_START = "<!-- BADGES_START -->"
BADGES_END = "<!-- BADGES_END -->"

TOOLS_START = "<!-- TOOLS_TABLE_START -->"
TOOLS_END = "<!-- TOOLS_TABLE_END -->"


def get_last_modified(file_path):
    """Return last git commit date for a file."""
    try:
        result = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd", "--date=short", file_path],
            stderr=subprocess.STDOUT
        ).decode("utf-8").strip()

        return result if result else datetime.now().strftime("%Y-%m-%d")

    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def extract_metadata(tool_path):
    """Extract metadata from page.tsx toolConfig block."""

    tsx_path = os.path.join(tool_path, "page.tsx")

    data = {
        "description": "React-based seller tool.",
        "version": "1.0.0",
        "status": "Stable",
        "platform": "General",
        "category": "Utilities"
    }

    if not os.path.exists(tsx_path):
        return data

    with open(tsx_path, "r", encoding="utf-8") as f:
        content = f.read()

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

    data["last_mod"] = get_last_modified(tsx_path)

    return data


def generate_badges(tools_data):
    """Generate dynamic README badges."""

    total = len(tools_data)
    stable = len([t for t in tools_data if t["status"] == "Stable"])

    date_now = datetime.now().strftime("%Y--%m--%d")

    vercel_status = (
        "![Vercel]"
        "(https://therealsujitk-vercel-badge.vercel.app/?app=smart-seller-tools)"
    )

    badges = [
        f"![Total Tools](https://img.shields.io/badge/Total_Tools-{total}-blue)",
        vercel_status,
        f"![Stable Tools](https://img.shields.io/badge/Stable-{stable}-brightgreen)",
        f"![Last Sync](https://img.shields.io/badge/Last_Sync-{date_now}-orange)",
        "![Maintained](https://img.shields.io/badge/Maintained%20by-github--actions-ff69b4)"
    ]

    return " ".join(badges) + "\n"


def generate_tools_table(tools_data):
    """Generate tools master table."""

    table = "| Status | Category | Platform | Tool | Description | Version | Last Updated | Live |\n"
    table += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"

    status_emojis = {
        "Stable": "✅",
        "Beta": "🧪",
        "Planned": "📅",
        "Deprecated": "⚠️"
    }

    platform_colors = {
        "Amazon": "FF9900",
        "Flipkart": "2874F0",
        "Meesho": "F43397",
        "Myntra": "FF3F6C",
        "General": "607D8B"
    }

    tools_sorted = sorted(
        tools_data,
        key=lambda x: (x["category"], x["name"])
    )

    for tool in tools_sorted:

        emoji = status_emojis.get(tool["status"], "✅")

        platform = tool["platform"]
        color = platform_colors.get(platform, "607D8B")

        badge = (
            f"![{platform}]"
            f"(https://img.shields.io/badge/-{platform}-{color}?style=flat-square)"
        )

        vercel_url = f"https://smart-seller-tools.vercel.app/tools/{tool['slug']}"

        live_badge = (
            f"[![Live]"
            f"(https://img.shields.io/badge/Vercel-Live-black?logo=vercel)]"
            f"({vercel_url})"
        )

        table += (
            f"| {emoji} | **{tool['category']}** | {badge} | "
            f"[{tool['name']}](./app/tools/{tool['slug']}) | "
            f"{tool['description']} | `v{tool['version']}` | "
            f"{tool['last_mod']} | {live_badge} |\n"
        )

    return table


def update_changelog(tool_name, version):

    date_str = datetime.now().strftime("%Y-%m-%d")

    entry = (
        f"## [{version}] - {date_str}\n"
        f"* **{tool_name}** version updated to {version}\n\n"
    )

    existing = ""

    if os.path.exists(CHANGELOG_PATH):
        with open(CHANGELOG_PATH, "r", encoding="utf-8") as f:
            existing = f.read()

    if entry not in existing:

        with open(CHANGELOG_PATH, "w", encoding="utf-8") as f:
            f.write(entry + existing)


def update_docs():

    if not os.path.exists(README_PATH):
        print("README.md not found")
        return

    folders = [
        f for f in os.listdir(TOOLS_DIR)
        if os.path.isdir(os.path.join(TOOLS_DIR, f)) and not f.startswith("[")
    ]

    tools = []

    for folder in folders:

        meta = extract_metadata(os.path.join(TOOLS_DIR, folder))

        tools.append({
            "slug": folder,
            "name": folder.replace("-", " ").title(),
            **meta
        })

    with open(README_PATH, "r", encoding="utf-8") as f:
        old_content = f.read()

    for tool in tools:
        version_marker = f"`v{tool['version']}`"
        if version_marker not in old_content:
            update_changelog(tool["name"], tool["version"])

    new_content = old_content

    if BADGES_START in new_content and BADGES_END in new_content:

        start = new_content.index(BADGES_START) + len(BADGES_START)
        end = new_content.index(BADGES_END)

        new_content = (
            new_content[:start]
            + "\n"
            + generate_badges(tools)
            + new_content[end:]
        )

    if TOOLS_START in new_content and TOOLS_END in new_content:

        start = new_content.index(TOOLS_START) + len(TOOLS_START)
        end = new_content.index(TOOLS_END)

        new_content = (
            new_content[:start]
            + "\n\n"
            + generate_tools_table(tools)
            + "\n"
            + new_content[end:]
        )

    if new_content == old_content:
        print("No README changes detected.")
        return

    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("README updated successfully.")


if __name__ == "__main__":
    update_docs()