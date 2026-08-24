import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import { v4 as uuidv4 } from "uuid";

const code = `<><hello a={b}><z></z><world></world></hello><a><b><d></d></b><c></c></a></>`;
const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });

const nodeMap = new Map();
const nodes = [];

traverse(ast, {
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

// Recursively prints an ASCII tree structure
function printAsciiTree(nodesList, prefix = "") {
  // Sort nodes alphabetically to keep output consistent
  const sortedNodes = [...nodesList].sort((a, b) => a.name.localeCompare(b.name));

  sortedNodes.forEach((node, index) => {
    const isLast = index === sortedNodes.length - 1;
    
    // Choose the right branch pointer
    const pointer = isLast ? "└── " : "├── ";
    
    console.log(`${prefix}${pointer}${node.name}`);
    
    // Compute the nested indentation prefix for children
    const newPrefix = prefix + (isLast ? "    " : "│   ");
    
    if (node.children && node.children.length > 0) {
      printAsciiTree(node.children, newPrefix);
    }
  });
}

// Print the top-level root
console.log("root");
printAsciiTree(rootNodes);
