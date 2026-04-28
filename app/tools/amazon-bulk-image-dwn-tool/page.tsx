import ToolClient from './ToolClient';

/**
 * METADATA FOR AUTOMATION
 * The github-actions[bot] reads this block to update the README and Changelog.
 */
export const metadata = {
  title: "Amazon Bulk Image Downloader",
  description: "Bulk download and auto-rename product images from Amazon using ASINs or URLs.",
  version: "2.1.2",
  status: "Stable",
  platform: "Amazon"
};

export default function Page() {
  return <ToolClient />;
}