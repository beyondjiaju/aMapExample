/** SDK 里有未使用的 `import { resolve } from "path"`，浏览器里不走 Node 的 path */
export function resolve(...parts: string[]) {
  return parts.join("/");
}

export default { resolve };
