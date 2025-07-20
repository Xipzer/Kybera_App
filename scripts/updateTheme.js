#!/usr/bin/env node
// Script to update theme colors across all components

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colorReplacements = [
  // Backgrounds
  { from: /bg-white(?!\w)/g, to: 'bg-surface-base' },
  { from: /dark:bg-gray-900(?!\w)/g, to: '' },
  { from: /bg-gray-50(?!\w)/g, to: 'bg-bg-subtle' },
  { from: /dark:bg-gray-800(?!\w)/g, to: '' },
  { from: /bg-gray-100(?!\w)/g, to: 'bg-surface-elevated' },
  { from: /dark:bg-gray-700(?!\w)/g, to: '' },
  { from: /hover:bg-gray-50(?!\w)/g, to: 'hover:bg-surface-hover' },
  { from: /dark:hover:bg-gray-800(?!\w)/g, to: '' },
  { from: /hover:bg-gray-100(?!\w)/g, to: 'hover:bg-surface-hover' },
  
  // Text
  { from: /text-gray-900(?!\w)/g, to: 'text-text-primary' },
  { from: /dark:text-gray-100(?!\w)/g, to: '' },
  { from: /text-gray-700(?!\w)/g, to: 'text-text-primary' },
  { from: /dark:text-gray-300(?!\w)/g, to: '' },
  { from: /text-gray-600(?!\w)/g, to: 'text-text-secondary' },
  { from: /dark:text-gray-400(?!\w)/g, to: '' },
  { from: /text-gray-500(?!\w)/g, to: 'text-text-tertiary' },
  { from: /dark:text-gray-500(?!\w)/g, to: '' },
  { from: /text-gray-400(?!\w)/g, to: 'text-text-tertiary' },
  
  // Borders
  { from: /border-gray-200(?!\w)/g, to: 'border-border-subtle' },
  { from: /dark:border-gray-800(?!\w)/g, to: '' },
  { from: /border-gray-300(?!\w)/g, to: 'border-border-default' },
  { from: /dark:border-gray-700(?!\w)/g, to: '' },
  { from: /border-gray-400(?!\w)/g, to: 'border-border-strong' },
  { from: /dark:border-gray-600(?!\w)/g, to: '' },
  
  // Blues to Accent
  { from: /bg-blue-600(?!\w)/g, to: 'bg-accent-500' },
  { from: /hover:bg-blue-700(?!\w)/g, to: 'hover:bg-accent-600' },
  { from: /bg-blue-50(?!\w)/g, to: 'bg-accent-50' },
  { from: /dark:bg-blue-900\/20(?!\w)/g, to: 'bg-accent-900/20' },
  { from: /text-blue-600(?!\w)/g, to: 'text-accent-500' },
  { from: /dark:text-blue-400(?!\w)/g, to: 'text-accent-400' },
  { from: /text-blue-800(?!\w)/g, to: 'text-accent-700' },
  { from: /dark:text-blue-200(?!\w)/g, to: 'text-accent-200' },
  { from: /border-blue-500(?!\w)/g, to: 'border-accent-500' },
  { from: /border-blue-200(?!\w)/g, to: 'border-accent-200' },
  { from: /dark:border-blue-800(?!\w)/g, to: 'border-accent-800' },
  { from: /focus:ring-blue-500(?!\w)/g, to: 'focus:ring-accent-500' },
  { from: /dark:data-\[state=active\]:text-blue-400(?!\w)/g, to: 'data-[state=active]:text-accent-400' },
  { from: /dark:data-\[state=active\]:border-blue-400(?!\w)/g, to: 'data-[state=active]:border-accent-400' },
  
  // Reds to Accent
  { from: /bg-red-50(?!\w)/g, to: 'bg-accent-50' },
  { from: /dark:bg-red-900\/20(?!\w)/g, to: 'bg-accent-900/20' },
  { from: /text-red-600(?!\w)/g, to: 'text-accent-500' },
  { from: /dark:text-red-400(?!\w)/g, to: 'text-accent-400' },
  { from: /hover:bg-red-50(?!\w)/g, to: 'hover:bg-accent-50' },
  { from: /dark:hover:bg-red-900\/20(?!\w)/g, to: 'hover:bg-accent-900/20' },
  { from: /border-red-200(?!\w)/g, to: 'border-accent-200' },
  { from: /dark:border-red-800(?!\w)/g, to: 'border-accent-800' },
  
  // Green colors
  { from: /bg-green-50(?!\w)/g, to: 'bg-primary-50' },
  { from: /dark:bg-green-900\/20(?!\w)/g, to: 'bg-primary-900/20' },
  { from: /text-green-800(?!\w)/g, to: 'text-primary-200' },
  { from: /dark:text-green-200(?!\w)/g, to: 'text-primary-200' },
  { from: /border-green-200(?!\w)/g, to: 'border-primary-200' },
  { from: /dark:border-green-800(?!\w)/g, to: 'border-primary-800' },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  colorReplacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      hasChanges = true;
      content = newContent;
    }
  });
  
  // Clean up double dark: prefixes
  content = content.replace(/dark:dark:/g, 'dark:');
  
  // Remove empty class segments
  content = content.replace(/\s+(?=\s)/g, ' ');
  
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

// Start from src/components directory
const componentsDir = path.join(__dirname, '..', 'src', 'components');
console.log('Updating theme colors in components...');
walkDirectory(componentsDir);
console.log('Theme update complete!');