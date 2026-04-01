export const env = {
  analyticsUrl: import.meta.env.MERMAID_ANALYTICS_URL ?? '',
  docsUrl: import.meta.env.MERMAID_DOCS_URL ?? 'https://mermaid.js.org',
  domain: import.meta.env.MERMAID_DOMAIN ?? '',
  githubPath: import.meta.env.MERMAID_GITHUB_PATH ?? '',
  githubRepo: import.meta.env.MERMAID_GITHUB_REPO ?? '',
  githubToken: import.meta.env.MERMAID_GITHUB_TOKEN ?? '',
  isEnabledMermaidChartLinks: false,
  krokiRendererUrl: import.meta.env.MERMAID_KROKI_RENDERER_URL ?? '',
  rendererUrl: import.meta.env.MERMAID_RENDERER_URL ?? ''
} as const;
