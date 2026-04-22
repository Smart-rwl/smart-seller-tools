import ToolClient from './ToolClient';

export const metadata = {
  title: "Amazon A/B Test Significance Calculator",
  description: "Calculate the statistical significance of your A/B tests on Amazon products.",
  version: "1.2.0",
  status: "Stable",
  platform: "Amazon"
};

export default function Page() {
  return <ToolClient />;
}