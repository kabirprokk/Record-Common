import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cloudinaryPoster } from "../src/lib/media-url.mjs";

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

test("archive uses generated Cloudinary posters and does not autoplay video downloads", async () => {
  const app = await readFile(new URL("src/components/archive-app.tsx", root), "utf8");

  assert.match(app, /poster=\{cloudinaryPoster\(video\.media_url\)\}/);
  assert.match(app, /import \{ cloudinaryPoster \} from "@\/lib\/media-url\.mjs"/);
  assert.match(app, /preload="none"/);
});

test("Cloudinary poster generation supports transformed legacy URLs and rejects other hosts", () => {
  assert.equal(
    cloudinaryPoster("https://res.cloudinary.com/demo/video/upload/q_auto/archive/clip.mp4"),
    "https://res.cloudinary.com/demo/video/upload/so_0,w_960,h_600,c_fill,q_auto/archive/clip.jpg",
  );
  assert.equal(cloudinaryPoster("https://example.org/video/upload/clip.mp4"), "");
  assert.equal(cloudinaryPoster("not a URL"), "");
});

test("privacy language does not promise anonymity and explains provider visibility", async () => {
  const app = await readFile(new URL("src/components/archive-app.tsx", root), "utf8");

  assert.doesNotMatch(app, /Your submission is anonymous/);
  assert.match(app, /network provider/i);
  assert.match(app, /Cloudinary/i);
});

test("site config applies browser security headers and a restrictive policy", async () => {
  const config = await readFile(new URL("next.config.ts", root), "utf8");

  for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "poweredByHeader: false"]) {
    assert.match(config, new RegExp(header));
  }
});

test("public media URLs use Cloudinary derived delivery without rewriting stored records", async () => {
  const api = await readFile(new URL("src/app/api/videos/route.ts", root), "utf8");

  assert.match(api, /row\.media_url\.replace\("\/video\/upload\/", "\/video\/upload\/q_auto\/"\)/);
  assert.match(api, /status=eq\.approved/);
  assert.doesNotMatch(api, /method:\s*"PATCH"|method:\s*"DELETE"/);
});
