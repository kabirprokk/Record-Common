import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cloudinaryPoster } from "../src/lib/media-url.mjs";

const root = new URL("../", import.meta.url);

test("review desk has a direct route but no public footer link", async () => {
  const app = await readFile(new URL("src/components/archive-app.tsx", root), "utf8");
  const reviewPage = await readFile(new URL("src/app/review/page.tsx", root), "utf8");

  assert.doesNotMatch(app, /onClick=\{\(\) => setPanel\("admin"\)\}>Review desk/);
  assert.doesNotMatch(app, /initialPanel/);
  assert.match(reviewPage, /<ReviewDesk\s*\/>/);
});

test("review desk is a full-page moderator workspace, not a modal overlay", async () => {
  const desk = await readFile(new URL("src/components/review-desk.tsx", root), "utf8");

  assert.match(desk, /className="review-page"/);
  assert.match(desk, /<h1[^>]*>Review desk<\/h1>/);
  assert.doesNotMatch(desk, /role="dialog"|dialog-backdrop/);
  assert.match(desk, /Lock review desk/);
});

test("review session probe reveals only the current request's authentication state", async () => {
  const route = await readFile(new URL("src/app/api/admin/session/route.ts", root), "utf8");

  assert.match(route, /isAdminSessionValid\(\)/);
  assert.match(route, /authenticated: await isAdminSessionValid\(\)/);
  assert.match(route, /Cache-Control.*no-store/);
});

test("uploads fail closed until the privacy relay is configured", async () => {
  const uploadRoute = await readFile(new URL("src/app/api/upload/sign/route.ts", root), "utf8");
  const server = await readFile(new URL("src/lib/server.ts", root), "utf8");

  assert.match(uploadRoute, /if\s*\(!relayUrl\)\s*throw/);
  assert.doesNotMatch(uploadRoute, /https:\/\/api\.cloudinary\.com\/v1_1/);
  assert.match(server, /uploadsEnabled\s*=\s*Boolean\([\s\S]*uploadRelayEnabled/);
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

test("archive videos switch to contain sizing in fullscreen", async () => {
  const styles = await readFile(new URL("src/app/globals.css", root), "utf8");

  assert.match(styles, /video:fullscreen[^}]*object-fit:\s*contain/s);
  assert.match(styles, /video:-webkit-full-screen[^}]*object-fit:\s*contain/s);
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
  assert.match(app, /identifying metadata/i);
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

test("homepage focuses on the search bar and video index without promotional hero sections", async () => {
  const app = await readFile(new URL("src/components/archive-app.tsx", root), "utf8");
  const styles = await readFile(new URL("src/app/globals.css", root), "utf8");

  assert.match(app, /id="archive-title">Video index/);
  assert.match(app, /type="search"/);
  assert.doesNotMatch(app, /className="hero"|className="principles"/);
  assert.doesNotMatch(app, /Contact details are not configured/);
  assert.match(styles, /\.site-shell\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
  assert.match(styles, /\.site-shell\s*>\s*main\s*\{[^}]*flex:\s*1/s);
});
