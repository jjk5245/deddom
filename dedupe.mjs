import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { v4 as uuidv4 } from "uuid";

const evaluate = traverse.default || traverse;
const currentDir = process.env.INIT_CWD || process.cwd();

const TARGET_DIR = currentDir;
const componentRelationships = {};

// Helper to recursively find JSX files
function getFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  
  const list = fs.readdirSync(dir);  for (const file of list) {
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


const analyzeCode = (code) => {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });

  const nodeMap = new Map();
  const nodes = [];

  evaluate(ast, {
    JSXElement(path) {
      const nodeName = path.node.openingElement.name.name;
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
          parentMeta = { id: meta.id, name: parentNode.openingElement.name.name };
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

  nodes.forEach(node => {
    registry[node.id] = node;
  });

  nodes.forEach(node => {
    const pId = node.parent.id;
    if (pId === "root-fragment") {
      rootNodes.push(node);
    } else if (registry[pId]) {
      registry[pId].children.push(node);
    }
  });

  function printAsciiTree(nodesList, prefix = "") {
    const sortedNodes = [...nodesList].sort((a, b) => a.name.localeCompare(b.name));

    sortedNodes.forEach((node, index) => {
      const isLast = index === sortedNodes.length - 1;
      
      const pointer = isLast ? "└── " : "├── ";
      
      console.log(`${prefix}${pointer}${node.name}`);
      
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      
      if (node.children && node.children.length > 0) {
        printAsciiTree(node.children, newPrefix);
      }
    });
  }

  printAsciiTree(rootNodes);
}

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  try {
    console.log(`Analyzing file: ${filePath}`);
    analyzeCode(code);
  } catch (error) {
    console.error(`Could not parse file ${filePath}:`, error.message);

  }
}


const allFiles = getFiles(TARGET_DIR);
allFiles.forEach(analyzeFile);

const finalizedTree = {};
for (const [parent, children] of Object.entries(componentRelationships)) {
  finalizedTree[parent] = Array.from(children);
}

