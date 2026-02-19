const hi2 = require("react-icons/hi2");
const fs = require("fs");
const path = require("path");

function findJsxFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== "node_modules") {
      results = results.concat(findJsxFiles(fullPath));
    } else if (item.name.endsWith(".jsx") || item.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findJsxFiles(path.join(__dirname, "..", "frontend", "src"));
const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-icons\/hi2['"]/g;
const iconRegex = /\b(Hi\w+)\b/g;
let errors = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1];
    let iconMatch;
    while ((iconMatch = iconRegex.exec(imports)) !== null) {
      const iconName = iconMatch[1];
      if (!hi2[iconName]) {
        const rel = path.relative(path.join(__dirname, ".."), file);
        errors.push(rel + ": " + iconName);
      }
    }
  }
}

if (errors.length === 0) {
  console.log("All hi2 icon imports are valid!");
} else {
  console.log("Invalid icon imports found:");
  errors.forEach(e => console.log("  " + e));
}
