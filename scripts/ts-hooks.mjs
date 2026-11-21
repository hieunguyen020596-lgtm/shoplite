import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const EMPTY = "data:text/javascript,export {}";

function withExtension(path) {
  for (const candidate of [path, `${path}.ts`, resolvePath(path, "index.ts")]) {
    if (/\.[cm]?[jt]s$/.test(candidate) && existsSync(candidate))
      return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: EMPTY, shortCircuit: true };
    let base = null;
    if (specifier.startsWith("@/"))
      base = resolvePath(root, "src", specifier.slice(2));
    else if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:")
    ) {
      base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (base) {
      const found = withExtension(base);
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
