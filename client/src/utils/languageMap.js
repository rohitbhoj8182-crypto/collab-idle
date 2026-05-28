export const LANGUAGE_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', html: 'html', css: 'css', scss: 'scss',
  json: 'json', md: 'markdown', rs: 'rust', go: 'go',
  java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp', rb: 'ruby',
  php: 'php', sh: 'shell', yaml: 'yaml', yml: 'yaml', xml: 'xml',
  sql: 'sql', kt: 'kotlin', swift: 'swift',
};

export const LANG_ICONS = {
  javascript: '🟨', typescript: '🔷', python: '🐍', html: '🌐',
  css: '🎨', json: '📦', markdown: '📝', rust: '🦀',
  go: '🐹', java: '☕', cpp: '⚡', ruby: '💎',
};

export const LANG_COLORS = {
  javascript: '#F7DC6F', typescript: '#85C1E9', python: '#82E0AA',
  html: '#F0B27A', css: '#BB8FCE', json: '#98D8C8',
};

export function detectLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return LANGUAGE_MAP[ext] || 'plaintext';
}

export const LANGUAGE_OPTIONS = [
  'javascript', 'typescript', 'python', 'html', 'css',
  'json', 'markdown', 'rust', 'go', 'java', 'cpp',
];
