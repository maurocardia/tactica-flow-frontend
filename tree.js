import fs from 'fs';
import path from 'path';

const EXCLUDE = ['node_modules', '.git', 'dist', '.vite', '.vscode'];

function printTree(dirPath, indent = '') {
    const items = fs.readdirSync(dirPath).filter(item => !EXCLUDE.includes(item));

    items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const branch = isLast ? '└── ' : '├── ';
        const fullPath = path.join(dirPath, item);
        const isDirectory = fs.statSync(fullPath).isDirectory();

        console.log(`${indent}${branch}${item}${isDirectory ? '/' : ''}`);

        if (isDirectory) {
            const nextIndent = indent + (isLast ? '    ' : '│   ');
            printTree(fullPath, nextIndent);
        }
    });
}

console.log('tactica-flow-frontend/');
printTree('.');