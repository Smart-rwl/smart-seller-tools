// app/tools/ab-test/ToolClient.tsx

// ... your imports

export default function Page() { // Removed the { slug } requirement from the Page component itself
  return <ToolClient slug="ab-test" />;
}