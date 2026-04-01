import { get } from 'svelte/store';
import { aiConfigStore, type AIConfig } from './aiConfig';

const buildPrompt = (code: string) => `
You are a helpful assistant that names Mermaid diagrams.
Based on the following Mermaid code, suggest a concise, descriptive filename.

Rules:
1. Detect the dominant language used in the diagram's text content (labels, descriptions, node text — ignore Mermaid syntax keywords like "graph", "flowchart", "sequenceDiagram", etc.).
2. Generate the filename in that same language.
3. For Latin-script languages (English, French, etc.), use kebab-case (e.g. auth-login-flow.mmd).
4. For non-Latin-script languages (Chinese, Japanese, Korean, Arabic, etc.), use natural short phrases with hyphens between words if needed (e.g. 用户登录流程.mmd, ログインフロー.mmd).
5. If the content is mixed-language, use the language that appears most frequently.
6. Keep the name concise — ideally 2-5 words.
7. The filename MUST end with .mmd.
8. Output ONLY the filename string, nothing else. No explanations, no quotes, no backticks.

Mermaid Code:
${code}
`;

export const suggestFilename = async (code: string): Promise<string> => {
  const config = get(aiConfigStore);
  if (config.provider === 'gemini') {
    return callGemini(config, buildPrompt(code));
  } else {
    return callOpenAI(config, buildPrompt(code));
  }
};

export const validateConfig = async (config: AIConfig): Promise<void> => {
  const prompt = 'Respond with "OK" if you can hear me.';
  if (config.provider === 'gemini') {
    await callGemini(config, prompt);
  } else {
    await callOpenAI(config, prompt);
  }
};

const callGemini = async (config: AIConfig, prompt: string): Promise<string> => {
  if (!config.geminiKey) throw new Error('Gemini API Key is missing');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return cleanFilename(text);
};

const callOpenAI = async (config: AIConfig, prompt: string): Promise<string> => {
  if (!config.openaiKey) throw new Error('OpenAI API Key is missing');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return cleanFilename(text);
};

const cleanFilename = (name: string): string => {
  // Remove quotes, backticks, and ensure it ends with .mmd
  let cleaned = name.replace(/[`"']/g, '').trim();
  if (!cleaned.endsWith('.mmd')) {
    cleaned += '.mmd';
  }
  return cleaned;
};
