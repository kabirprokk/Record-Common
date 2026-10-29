import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("review desk has a direct route but no public footer link", async () => {
  const app = await readFile(new URL("src/components/archive-app.tsx", root), "utf8");
  const reviewPage = await readFile(new URL("src/app/review/page.tsx", root), "utf8");

  assert.doesNotMatch(app, /onClick=\{\(\) => setPanel\("admin"\)\}>Review desk/);
  assert.match(app, /initialPanel\?: Panel/);
  assert.match(reviewPage, /<ArchiveApp initialPanel="admin"\s*\/>/);
});

test("moderator password remains server-side and API access stays session-gated", async () => {
  const login = await readFile(new URL("src/app/api/admin/login/route.ts", root), "utf8");
  const submissions = await readFile(new URL("src/app/api/admin/submissions/route.ts", root), "utf8");

  assert.match(login, /verifyAdminPassword\(data\.password\)/);
  assert.match(submissions, /isAdminSessionValid\(\)/);
});
