import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidateMembers, MemberValidationError } from "./validate.mjs";

const ROOT_DIRECTORY = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIRECTORY = join(ROOT_DIRECTORY, "dist");

async function build() {
  const members = await loadAndValidateMembers(ROOT_DIRECTORY);
  const announcement = await readFile(join(ROOT_DIRECTORY, "announcement.txt"), "utf8");

  await rm(DIST_DIRECTORY, { recursive: true, force: true });
  await mkdir(DIST_DIRECTORY, { recursive: true });

  await cp(join(ROOT_DIRECTORY, "index.html"), join(DIST_DIRECTORY, "index.html"));
  await cp(join(ROOT_DIRECTORY, "assets"), join(DIST_DIRECTORY, "assets"), { recursive: true });

  const output = {
    announcement: announcement.trim(),
    members,
  };

  await writeFile(
    join(DIST_DIRECTORY, "data.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );

  console.log(`✓ dist/ を生成しました（メンバー${members.length}件）。`);
  console.log("  公開ファイル: index.html, assets/, data.json");
}

try {
  await build();
} catch (error) {
  if (error instanceof MemberValidationError) {
    console.error("\nビルドを中止しました。メンバーデータを修正してください。\n");
    error.errors.forEach((message) => console.error(`- ${message}`));
  } else {
    console.error("\nビルド中にエラーが発生しました。ファイル構成を確認してください。\n");
    console.error(error);
  }
  process.exitCode = 1;
}
