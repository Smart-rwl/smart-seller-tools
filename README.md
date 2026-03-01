# Smart Seller Tools 🚀

[![Framework: Next.js](https://img.shields.io/badge/Framework-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Deployment: Vercel](https://img.shields.io/badge/Deployment-Vercel-000000?logo=vercel)](https://smart-seller-tools.vercel.app/)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript)](https://www.typescriptlang.org/)

A professional suite of web-based utilities designed for e-commerce sellers on **Amazon, Flipkart, Myntra, and Meesho**. This application provides real-time tools to automate data extraction, analyze seller metrics, and optimize marketplace operations.

🔗 **Live Application:** [https://smart-seller-tools.vercel.app/](https://smart-seller-tools.vercel.app/)

---

## ✨ Featured Tools

All tools are built as modular **.tsx** components located in `app/tools`, ensuring a fast, type-safe, and responsive user experience:

* **Amazon Seller Revealer:** Instantly extract seller details, clickable ratings, and automated CSV exports directly from your browser.
* **E-commerce Analytics:** Visualize sales trends and performance metrics.
* **Data Utilities:** Format and clean marketplace data for bulk uploads and inventory management.
* **Smart Automation:** Client-side scripts that simplify repetitive seller tasks without needing back-end processing.

## 🚀 Tech Stack

* **Frontend:** React.js with Next.js (App Router)
* **Language:** TypeScript (.tsx) for robust type safety
* **Styling:** Tailwind CSS
* **Deployment:** Vercel for high-performance edge hosting

## 📂 Project Structure

```text
smart-seller-tools/
├── app/
│   ├── tools/            # Individual .tsx tool components
│   │   ├── amazon-revealer/
│   │   ├── csv-generator/
│   │   └── ...
│   └── layout.tsx        # Global UI wrapper
├── components/           # Reusable UI elements
└── public/               # Static assets
