#!/usr/bin/env node
// Script to update theme colors across all components while preserving formatting

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colorReplacements = [
  // Backgrounds - only exact matches
  { from: 'bg-white', to: 'bg-surface-base' },
  { from: 'dark:bg-gray-900', to: '' },
  { from: 'bg-gray-50', to: 'bg-bg-subtle' },
  { from: 'dark:bg-gray-800', to: '' },
  { from: 'bg-gray-100', to: 'bg-surface-elevated' },
  { from: 'dark:bg-gray-700', to: '' },
  { from: 'hover:bg-gray-50', to: 'hover:bg-surface-hover' },
  { from: 'hover:bg-gray-100', to: 'hover:bg-surface-hover' },
  { from: 'dark:hover:bg-gray-800', to: '' },
  
  // Text
  { from: 'text-gray-900', to: 'text-text-primary' },
  { from: 'dark:text-gray-100', to: '' },
  { from: 'text-gray-700', to: 'text-text-primary' },
  { from: 'dark:text-gray-300', to: '' },
  { from: 'text-gray-600', to: 'text-text-secondary' },
  { from: 'dark:text-gray-400', to: '' },
  { from: 'text-gray-500', to: 'text-text-tertiary' },
  { from: 'dark:text-gray-500', to: '' },
  { from: 'text-gray-400', to: 'text-text-tertiary' },
  
  // Borders
  { from: 'border-gray-200', to: 'border-border-subtle' },
  { from: 'dark:border-gray-800', to: '' },
  { from: 'border-gray-300', to: 'border-border-default' },
  { from: 'dark:border-gray-700', to: '' },
  { from: 'border-gray-400', to: 'border-border-strong' },
  { from: 'dark:border-gray-600', to: '' },
  
  // Blues to Accent
  { from: 'bg-blue-600', to: 'bg-accent-500' },
  { from: 'hover:bg-blue-700', to: 'hover:bg-accent-600' },
  { from: 'bg-blue-50', to: 'bg-accent-50' },
  { from: 'dark:bg-blue-900/20', to: 'bg-accent-900/20' },
  { from: 'text-blue-600', to: 'text-accent-500' },
  { from: 'dark:text-blue-400', to: 'text-accent-400' },
  { from: 'text-blue-800', to: 'text-accent-700' },
  { from: 'dark:text-blue-200', to: 'text-accent-200' },
  { from: 'border-blue-500', to: 'border-accent-500' },
  { from: 'border-blue-200', to: 'border-accent-200' },
  { from: 'dark:border-blue-800', to: 'border-accent-800' },
  { from: 'focus:ring-blue-500', to: 'focus:ring-accent-500' },
  
  // Reds to Accent
  { from: 'bg-red-50', to: 'bg-accent-50' },
  { from: 'dark:bg-red-900/20', to: 'bg-accent-900/20' },
  { from: 'text-red-600', to: 'text-accent-500' },
  { from: 'dark:text-red-400', to: 'text-accent-400' },
  { from: 'hover:bg-red-50', to: 'hover:bg-accent-50' },
  { from: 'dark:hover:bg-red-900/20', to: 'hover:bg-accent-900/20' },
  { from: 'border-red-200', to: 'border-accent-200' },
  { from: 'dark:border-red-800', to: 'border-accent-800' },
  
  // Green colors
  { from: 'bg-green-50', to: 'bg-primary-50' },
  { from: 'dark:bg-green-900/20', to: 'bg-primary-900/20' },
  { from: 'text-green-800', to: 'text-primary-200' },
  { from: 'dark:text-green-200', to: 'text-primary-200' },
  { from: 'border-green-200', to: 'border-primary-200' },
  { from: 'dark:border-green-800', to: 'border-primary-800' },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  colorReplacements.forEach(({ from, to }) => {
    // Use word boundaries to ensure we're matching complete class names
    const regex = new RegExp(`\\b${from}\\b`, 'g');
    const newContent = content.replace(regex, to);
    if (newContent !== content) {
      hasChanges = true;
      content = newContent;
    }
  });
  
  // Clean up empty dark: prefixes and extra spaces
  content = content.replace(/dark:\s+(?=\s)/g, '');
  content = content.replace(/\s+(?=\s)/g, ' ');
  content = content.replace(/"\s+"/g, '" "');
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
      updateFile(filePath);
    }
  });
}

// Update specific important files first
const importantFiles = [
  'src/components/auth/UnlockScreen.tsx',
  'src/components/wallet/WalletDrawer.tsx',
  'src/components/wallet/CreateGroupDialog.tsx',
  'src/components/layout/MainLayout.tsx',
];

console.log('Updating theme colors in important files...');
importantFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    updateFile(filePath);
  }
});

console.log('\nTheme update complete!');
console.log('Run "npm run format" to fix any formatting issues.');