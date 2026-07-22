import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIRECTORY = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIRECTORY = join(ROOT_DIRECTORY, "dist");
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function getFilePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(DIST_DIRECTORY, relativePath);
  const allowedPrefix = `${resolve(DIST_DIRECTORY)}${sep}`;
  return filePath.startsWith(allowedPrefix) ? filePath : null;
}

const server = createServer(async (request, response) => {
  const filePath = getFilePath(request.url || "/");

  try {
    if (!filePath || !(await stat(filePath)).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404: ファイルが見つかりません");
      return;
    }

    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404: ファイルが見つかりません");
  }
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  console.log(`Team Status Board: http://${displayHost}:${PORT}`);
  console.log("終了するには Ctrl+C を押してください。");
});
