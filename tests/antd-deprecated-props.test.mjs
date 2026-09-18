import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const srcRoot = fileURLToPath(new URL("../src", import.meta.url));

const deprecatedProps = new Map([
  ["Drawer", new Map([
    ["bodyStyle", "styles.body"],
    ["contentWrapperStyle", "styles.wrapper"],
    ["destroyInactivePanel", "destroyOnHidden"],
    ["drawerStyle", "styles.section"],
    ["footerStyle", "styles.footer"],
    ["headerStyle", "styles.header"],
    ["height", "size"],
    ["maskStyle", "styles.mask"],
    ["width", "size"],
  ])],
  ["Modal", new Map([
    ["autoFocusButton", "focusable.autoFocusButton"],
    ["bodyStyle", "styles.body"],
    ["destroyOnClose", "destroyOnHidden"],
    ["focusTriggerAfterClose", "focusable.focusTriggerAfterClose"],
    ["maskClosable", "mask.closable"],
    ["maskStyle", "styles.mask"],
  ])],
  ["Progress", new Map([
    ["gapPosition", "gapPlacement"],
    ["trailColor", "railColor"],
    ["width", "size"],
  ])],
  ["Tabs", new Map([["indicatorSize", "indicator={{ size: ... }}"]])],
]);

async function listTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listTsxFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith(".tsx") ? [entryPath] : [];
    }),
  );

  return nested.flat();
}

function findDeprecatedAntdProps(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const antdLocals = new Map();
  const violations = [];

  for (const node of sourceFile.statements) {
    if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== "antd") {
      continue;
    }

    const namedBindings = node.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    for (const specifier of namedBindings.elements) {
      const importedName = (specifier.propertyName ?? specifier.name).text;

      if (deprecatedProps.has(importedName)) {
        antdLocals.set(specifier.name.text, importedName);
      }
    }
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName;
      const componentName = ts.isIdentifier(tagName)
        ? antdLocals.get(tagName.text)
        : undefined;
      const propRules = componentName ? deprecatedProps.get(componentName) : undefined;

      if (propRules) {
        for (const prop of node.attributes.properties) {
          if (!ts.isJsxAttribute(prop)) {
            continue;
          }

          const replacement = propRules.get(prop.name.text);

          if (replacement) {
            const position = sourceFile.getLineAndCharacterOfPosition(
              prop.name.getStart(sourceFile),
            );
            violations.push(
              `${filePath}:${position.line + 1}:${position.character + 1} ${componentName}.${prop.name.text} is deprecated; use ${replacement}`,
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return violations;
}

test("detects deprecated Ant Design JSX props", () => {
  const violations = findDeprecatedAntdProps(
    "example.tsx",
    'import { Drawer as AntDrawer } from "antd";\n<AntDrawer width={400} />;',
  );

  assert.deepEqual(violations, [
    "example.tsx:2:12 Drawer.width is deprecated; use size",
  ]);
});

test("does not use deprecated Ant Design JSX props in source", async () => {
  const files = await listTsxFiles(srcRoot);
  const violations = (
    await Promise.all(
      files.map(async (filePath) =>
        findDeprecatedAntdProps(
          path.relative(process.cwd(), filePath),
          await readFile(filePath, "utf8"),
        ),
      ),
    )
  ).flat();

  assert.deepEqual(violations, []);
});
