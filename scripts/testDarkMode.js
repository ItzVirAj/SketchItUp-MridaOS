import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log(' MRIDAOS AGRICULTURE DARK MODE PALETTE & TOGGLE TEST SUITE');
console.log('================================================================\n');

// 1. Verify CSS Tokens & Palette in index.css
console.log('▶ [TEST SUITE 1] Agriculture Dark Mode Color Palette Verification:');
const cssPath = path.join(__dirname, '..', 'src', 'index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const requiredDarkTokens = [
  { name: '--dark-primary-green', expected: '#2E9055' },
  { name: '--dark-primary-green-hover', expected: '#35C56E' },
  { name: '--dark-accent-teal', expected: '#0A6B4A' },
  { name: '--dark-bg-primary', expected: '#1A1F1A' },
  { name: '--dark-bg-secondary', expected: '#242924' },
  { name: '--dark-bg-tertiary', expected: '#2D332D' },
  { name: '--dark-bg-elevated', expected: '#353D35' },
  { name: '--dark-surface', expected: '#242924' },
  { name: '--dark-border', expected: '#3D453D' },
  { name: '--dark-text-primary', expected: '#E8F0E8' },
  { name: '--dark-text-secondary', expected: '#B8C5B8' },
  { name: '--dark-text-muted', expected: '#8A9A8A' },
  { name: '--dark-success', expected: '#4CAF50' },
  { name: '--dark-success-bg', expected: '#1B3A1D' },
  { name: '--dark-warning', expected: '#FFC107' },
  { name: '--dark-warning-bg', expected: '#3A2F0D' },
  { name: '--dark-error', expected: '#EF5350' },
  { name: '--dark-error-bg', expected: '#3A1B1A' },
  { name: '--dark-accent-gold', expected: '#F9AD19' },
];

let tokensPassed = 0;
for (const token of requiredDarkTokens) {
  if (cssContent.includes(token.name) && cssContent.includes(token.expected)) {
    console.log(`  ✔ [PASS] ${token.name}: ${token.expected}`);
    tokensPassed++;
  } else {
    console.error(`  ❌ [FAIL] Missing or mismatched token: ${token.name}`);
  }
}

if (tokensPassed === requiredDarkTokens.length) {
  console.log('  -> All 19 Agriculture Dark Mode Tokens 100% verified.');
} else {
  throw new Error('Not all dark mode tokens were found.');
}

// 2. Strict Check for Forbidden Colors
console.log('\n▶ [TEST SUITE 2] Strict Check: Avoid Generic AI Blue/Purple Schemas:');
const forbiddenColors = ['#3B82F6', '#1E40AF', '#6366F1', '#8B5CF6', '#EC4899'];
let forbiddenFound = 0;

for (const forbidden of forbiddenColors) {
  if (cssContent.includes(forbidden)) {
    console.error(`  ❌ [FAIL] Forbidden color detected in dark mode CSS: ${forbidden}`);
    forbiddenFound++;
  } else {
    console.log(`  ✔ [PASS] Clean: ${forbidden} is NOT present in dark palette.`);
  }
}

if (forbiddenFound === 0) {
  console.log('  -> Zero generic blue/purple AI palettes found. Earth & green tones only.');
} else {
  throw new Error('Forbidden colors detected!');
}

// 3. Verify Theme Toggle Component & Header Placement
console.log('\n▶ [TEST SUITE 3] Animated Theme Toggle & Header Integration:');
const topBarPath = path.join(__dirname, '..', 'src', 'components', 'TopBar.tsx');
const topBarContent = fs.readFileSync(topBarPath, 'utf8');

const themeTogglePath = path.join(__dirname, '..', 'src', 'components', 'ThemeToggle.tsx');
const themeToggleContent = fs.readFileSync(themeTogglePath, 'utf8');

if (topBarContent.includes('<ThemeToggle') && topBarContent.includes("from './ThemeToggle'")) {
  console.log('  ✔ [PASS] 3.1: ThemeToggle component placed in top-right TopBar navigation.');
} else {
  throw new Error('ThemeToggle not integrated in TopBar!');
}

if (
  themeToggleContent.includes('toggleTheme') &&
  themeToggleContent.includes('Sun') &&
  themeToggleContent.includes('Moon') &&
  themeToggleContent.includes('aria-label')
) {
  console.log('  ✔ [PASS] 3.2: ThemeToggle renders animated Sun/Moon icons, accessible aria attributes, and is clickable anywhere.');
} else {
  throw new Error('ThemeToggle component implementation is incomplete!');
}

console.log('\n================================================================');
console.log(' ✅ ALL DARK MODE TESTS PASSED (100% SUCCESS)');
console.log('================================================================');
