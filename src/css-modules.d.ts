// TypeScript declarations for CSS imports with ?inline query
declare module "*.css?inline" {
  const content: string;
  export default content;
}

// Also include generic CSS module declarations
declare module "*.css" {
  const content: string;
  export default content;
}

// Declaration for raw CSS imports as string
declare module "*.css?raw" {
  const content: string;
  export default content;
}
