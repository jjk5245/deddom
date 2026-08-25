import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { v4 as uuidv4 } from "uuid";

const evaluate = traverse.default || traverse;
const TARGET_DIR = process.env.INIT_CWD || process.cwd();

// Global registries aggregated across all files
const globalVerticalMap = new Map();
const globalHorizontalMap = new Map();

function getFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  
  const list = fs.readdirSync(dir);  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      files = files.concat(getFiles(filePath));
    } else if (/\.(jsx|tsx|js|ts)$/.test(file)) {
      files.push(filePath);
    }
  }
  return files;
}

// Efficient O(N^2) contiguous subarray extraction instead of O(2^N) backtracking
function getContiguousSubsequences(pathArray) {
  const result = new Set();
  for (let i = 0; i < pathArray.length; i++) {
    for (let j = i + 1; j <= pathArray.length; j++) {
      result.add(pathArray.slice(i, j).join('-'));
    }
  }
  return Array.from(result);
}

export const analyzeCode = (code) => {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  const nodeMap = new Map();
  const nodes = [];

  evaluate(ast, {
    JSXElement(path) {
      // Safely extract name handles for both simple identifiers and member expressions (e.g., Shard.Item)
      const extractName = (node) => {
        if (!node) return 'Unknown';
        if (node.type === 'JSXIdentifier') return node.name;
        if (node.type === 'JSXMemberExpression') return `${extractName(node.object)}.${node.property.name}`;
        return 'Unknown';
      };

      const nodeName = extractName(path.node.openingElement.name);
      
      if (!nodeMap.has(path.node)) {
        nodeMap.set(path.node, { id: uuidv4(), children: [] });
      }
      const currentMeta = nodeMap.get(path.node);
      let parentPath = path.parentPath;
      let parentMeta = { id: "root-fragment", name: "JSXFragment" };

      while (parentPath) {
        if (parentPath.isJSXElement()) {
          const parentNode = parentPath.node;
          if (!nodeMap.has(parentNode)) {
            nodeMap.set(parentNode, { id: uuidv4(), children: [] });
          }
          const meta = nodeMap.get(parentNode);
          parentMeta = { id: meta.id, name: extractName(parentNode.openingElement.name) };
          break;
        } else if (parentPath.isJSXFragment()) {
          parentMeta = { id: "root-fragment", name: "JSXFragment" };
          break;
        }
        parentPath = parentPath.parentPath;
      }
      const structureNode = { id: currentMeta.id, name: nodeName, parent: parentMeta, children: currentMeta.children };
      nodes.push(structureNode);
    }
  });

  const registry = {};
  const rootNodes = [];

  nodes.forEach(node => { registry[node.id] = node; });
  nodes.forEach(node => {
    const pId = node.parent.id;
    if (pId === "root-fragment") {
      rootNodes.push(node);
    } else if (registry[pId]) {
      registry[pId].children.push(node);
    }
  });

  // Local maps to track unique occurrences strictly inside the current file execution
  const localCallPathMap = new Map();
  const localChildArray = [];

  function buildCallPathMap(nodesList, parentPath) {
    nodesList.forEach(node => {
      const currentPath = `${parentPath}-${node.name}`;
      const isLeafNode = !node.children || node.children.length === 0;
      
      if (isLeafNode) { 
        localCallPathMap.set(currentPath, (localCallPathMap.get(currentPath) || 0) + 1);
      }
      if (node.children && node.children.length > 0) {
        const siblingString = node.children.map(child => child.name).sort().join('-');
        localChildArray.push(siblingString);
        buildCallPathMap(node.children, currentPath);
      }
    });
  }

  buildCallPathMap(rootNodes, "root-fragment");

  // 1. Process Vertical Sequences (Top-down paths)
  const fullPaths = Array.from(localCallPathMap.keys()).map(key => key.split('-'));
  fullPaths.forEach(pathArray => {
    const subsequences = getContiguousSubsequences(pathArray);
    subsequences.forEach(subsequence => {
      globalVerticalMap.set(subsequence, (globalVerticalMap.get(subsequence) || 0) + 1);
    });
  });

  // 2. Process Horizontal Sequences (Sibling patterns)
  localChildArray.forEach(childPattern => {
    const parts = childPattern.split('-');
    const subsequences = getContiguousSubsequences(parts);
    subsequences.forEach(subsequence => {
      globalHorizontalMap.set(subsequence, (globalHorizontalMap.get(subsequence) || 0) + 1);
    });
  });
};

export function analyzeFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    console.log(`Analyzing file: ${filePath}`);
    analyzeCode(code);
  } catch (error) {
    console.error(`Could not parse file ${filePath}:`, error.message);
  }
}

export const analyzeDir = (targetDir) => {
  const allFiles = getFiles(targetDir);
  allFiles.forEach(analyzeFile);

  // Formatting configurations to sort by match frequency counts
  const sortedVertical = [...globalVerticalMap.entries()].sort((a, b) => b[1] - a[1]);
  const sortedHorizontal = [...globalHorizontalMap.entries()].sort((a, b) => b[1] - a[1]);

  fs.writeFileSync(
    'subsequences.json', 
    JSON.stringify({ vertical: sortedVertical, horizontal: sortedHorizontal }, null, 2)
  );
  console.log('Analysis finished. Saved patterns to subsequences.json');
};

analyzeDir(TARGET_DIR);
