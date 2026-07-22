import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ALLOWED_STATUSES = ["未着手", "作業中", "確認待ち", "完了"];
const REQUIRED_FIELDS = ["name", "role", "status", "message"];
const FILE_NAME_PATTERN = /^[a-z0-9-]+\.json$/;
const ROOT_DIRECTORY = dirname(dirname(fileURLToPath(import.meta.url)));

export class MemberValidationError extends Error {
  constructor(errors) {
    super(`${errors.length}件の入力エラーがあります。`);
    this.name = "MemberValidationError";
    this.errors = errors;
  }
}

function countCharacters(value) {
  return Array.from(value).length;
}

function addLengthError(errors, relativePath, label, value, maxLength) {
  if (typeof value === "string" && countCharacters(value) > maxLength) {
    errors.push(`${relativePath}: ${label}は${maxLength}文字以内にしてください（現在${countCharacters(value)}文字です）。`);
  }
}

function validateMember(relativePath, value, errors) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    errors.push(`${relativePath}: JSONの一番外側は { } で囲んだオブジェクトにしてください。`);
    return null;
  }

  const errorCountBefore = errors.length;

  for (const field of REQUIRED_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      errors.push(`${relativePath}: 必須項目「${field}」がありません。見本ファイルと同じ4項目を追加してください。`);
      continue;
    }

    if (typeof value[field] !== "string") {
      errors.push(`${relativePath}: 「${field}」はダブルクォートで囲んだ文字列にしてください。`);
      continue;
    }

    if (value[field].trim() === "") {
      errors.push(`${relativePath}: 「${field}」を空欄にできません。文字を入力してください。`);
    }
  }

  addLengthError(errors, relativePath, "name（名前）", value.name, 30);
  addLengthError(errors, relativePath, "role（担当）", value.role, 30);
  addLengthError(errors, relativePath, "message（ひとこと）", value.message, 100);

  if (typeof value.status === "string" && !ALLOWED_STATUSES.includes(value.status.trim())) {
    errors.push(`${relativePath}: status（状態）は「${ALLOWED_STATUSES.join("」「")}」のいずれかにしてください。`);
  }

  if (errors.length !== errorCountBefore) {
    return null;
  }

  return {
    name: value.name.trim(),
    role: value.role.trim(),
    status: value.status.trim(),
    message: value.message.trim(),
  };
}

export async function loadAndValidateMembers(rootDirectory = ROOT_DIRECTORY) {
  const membersDirectory = join(rootDirectory, "members");
  const errors = [];
  let entries;

  try {
    entries = await readdir(membersDirectory, { withFileTypes: true });
  } catch (error) {
    throw new MemberValidationError([
      `members/: フォルダーを読み込めませんでした。membersフォルダーがあるか確認してください（${error.message}）。`,
    ]);
  }

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "ja"));

  const members = [];
  const nameToFile = new Map();

  for (const fileName of files) {
    const relativePath = `members/${fileName}`;

    if (!FILE_NAME_PATTERN.test(fileName)) {
      errors.push(`${relativePath}: ファイル名は半角小文字・数字・ハイフンだけを使い、.jsonで終えてください（例: tanaka-san.json）。`);
    }

    let parsed;
    try {
      const source = await readFile(join(membersDirectory, fileName), "utf8");
      parsed = JSON.parse(source);
    } catch (error) {
      errors.push(`${relativePath}: JSONとして読み込めません。カンマ、ダブルクォート、{ } の対応を確認してください（${error.message}）。`);
      continue;
    }

    const member = validateMember(relativePath, parsed, errors);
    if (!member) {
      continue;
    }

    if (nameToFile.has(member.name)) {
      errors.push(`${relativePath}: name（名前）の「${member.name}」は ${nameToFile.get(member.name)} と重複しています。別の表示名にしてください。`);
      continue;
    }

    nameToFile.set(member.name, relativePath);
    members.push(member);
  }

  if (errors.length > 0) {
    throw new MemberValidationError(errors);
  }

  return members.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

function printValidationErrors(error) {
  console.error("\nメンバーデータの検証に失敗しました。次の内容を修正してください。\n");
  error.errors.forEach((message) => console.error(`- ${message}`));
  console.error(`\n合計: ${error.errors.length}件のエラー`);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  try {
    const members = await loadAndValidateMembers();
    console.log(`✓ メンバーデータの検証に成功しました（${members.length}件）。`);
  } catch (error) {
    if (error instanceof MemberValidationError) {
      printValidationErrors(error);
    } else {
      console.error("\n検証中に予期しないエラーが発生しました。", error);
    }
    process.exitCode = 1;
  }
}
