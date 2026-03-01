# 📸 Amazon Image Tool (High-Res Asset Suite)

A comprehensive media toolkit designed for Amazon sellers, researchers, and e-commerce developers. This tool automates the extraction and organization of high-resolution product media that is typically restricted or hidden behind Amazon's dynamic UI.

---

## 🛠️ Core Tools (`/app/tools`)

The engine of this repository is located in the `app/tools` directory, featuring modular utilities for asset management:

### 1. **Hi-Res Resolver**
- **Purpose:** Identifies the absolute highest-resolution "Original" image.
- **How it works:** Automatically strips Amazon's dynamic resizing strings (e.g., `._AC_SS40_`) from image URLs to reveal the 2000px+ source file.
- **Benefit:** Essential for creating high-quality marketing materials and competitive listing analysis.

### 2. **Variant Asset Mapper**
- **Purpose:** Correlates images with specific product variations.
- **How it works:** Scans the product's color and style swatches to map lifestyle and studio images to their respective parent/child ASINs.

### 3. **Batch Downloader Engine**
- **Purpose:** Handles the queuing and parallel processing of image downloads.
- **How it works:** Aggregates all discovered URLs from a page and executes a streamlined download process to save time.

### 4. **UI Bridge**
- **Purpose:** Injects the "Download All" and "View Hi-Res" buttons directly into the Amazon interface.
- **How it works:** A lightweight script that monitors page mutations to ensure buttons appear even when switching between different product variants.

---

## 🚀 Key Features

- **One-Click Bulk Export:** Download an entire product's media gallery (Main, Lifestyle, Video frames) in seconds.
- **Multi-Domain Support:** Fully compatible with `.in`, `.com`, `.de`, `.co.jp`, and all other global Amazon marketplaces.
- **Clean Naming:** Automatically renames files based on the ASIN and image type for organized storage.
- **Lightweight Architecture:** Optimized code that doesn't slow down your browser during research sessions.

---

## 💻 Installation & Usage

### As a Developer
1. Clone the repository:
   ```bash
   git clone [https://github.com/Smart-rwl/amazon-image-tool.git](https://github.com/Smart-rwl/amazon-image-tool.git)
