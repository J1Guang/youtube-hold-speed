import { chromium } from "playwright";
import { readFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const assetDir = path.join(root, "store", "assets");
await mkdir(assetDir, { recursive: true });
const chromePath = process.env.CHROME_EXECUTABLE;
const context = await chromium.launchPersistentContext("", {
  ...(chromePath ? { executablePath: chromePath } : { channel: "chromium" }),
  headless: true,
  deviceScaleFactor: 1,
  ignoreDefaultArgs: ["--disable-extensions"],
  args: ["--enable-unsafe-extension-debugging"],
});

const pngData = async (filename) => "data:image/png;base64," + (await readFile(filename)).toString("base64");
const page = await context.newPage();
async function render(name, width, height, html) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(assetDir, name), animations: "disabled" });
}

try {
  const svg = await readFile(path.join(root, "store", "icon.svg"), "utf8");
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{width:100%;height:100%;display:block}</style>${svg}`);
    await page.screenshot({ path: path.join(root, "extension", "icons", `icon${size}.png`), omitBackground: true });
  }
  await copyFile(path.join(root, "extension", "icons", "icon128.png"), path.join(assetDir, "icon-128.png"));

  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send("Extensions.loadUnpacked", { path: path.join(root, "extension") });
  await cdp.detach();
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 360, height: 800 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForFunction(() => !document.querySelector("#speed-options").disabled);
  await popup.locator("body").screenshot({ path: path.join(assetDir, "popup-preview.png") });
  await popup.close();

  const icon = await pngData(path.join(assetDir, "icon-128.png"));
  const first = await pngData(path.join(root, "store", "reference", "playback-demo.png"));
  const second = await pngData(path.join(root, "store", "reference", "game-demo.png"));
  const settings = await pngData(path.join(assetDir, "popup-preview.png"));
  const base = `*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#121622;color:#f7f7fc;font-family:'Segoe UI','Microsoft YaHei',sans-serif}img{display:block}h1,h2,p{margin:0}.pink{color:#ff81ad}.muted{color:#adb5ca}.brand{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:600;letter-spacing:-.3px}.brand img{width:52px;height:52px}.brand small{font-size:14px;font-weight:400;color:#a9b3c8;margin-left:8px}.pill{border:1px solid #434b60;border-radius:999px;padding:10px 18px;font-size:17px;color:#cbd2e3}kbd{font-family:inherit;border:1px solid #79829a;border-bottom:4px solid #79829a;border-radius:12px;padding:0 15px;background:#262d40}`;

  await render("screenshot-01-playback-1280x800.png", 1280, 800, `<!doctype html><meta charset="utf-8"><style>${base}
    body{background:radial-gradient(ellipse at 90% 0%,#342238,transparent 55%),#121622}
    header{height:124px;padding:28px 48px;display:flex;align-items:center;justify-content:space-between}
    h1{font-size:34px;font-weight:650;letter-spacing:-1px}.frame{margin:0 64px;width:1152px;border:1px solid #3d4354;border-radius:14px;overflow:hidden;background:#0b0e14}.frame img{width:100%;height:auto}
    </style><header><div><h1>按住 <span class="pink">→</span>，临时加速。</h1><p class="muted" style="margin-top:8px;font-size:17px">松开恢复原速 · 默认 3×，可选 2× / 3× / 4×</p></div><div class="brand"><img src="${icon}"><div>Hold Speed<small>for YouTube</small></div></div></header><div class="frame"><img src="${first}" alt="用户提供的 YouTube 实测画面，显示 3 倍速提示"></div>`);

  await render("screenshot-02-settings-1280x800.png", 1280, 800, `<!doctype html><meta charset="utf-8"><style>${base}
    body{background:radial-gradient(ellipse at 95% 0%,#42243d,transparent 55%),#121622}
    header{padding:35px 48px 22px;display:flex;justify-content:space-between;align-items:center}h1{font-size:38px;letter-spacing:-1.2px;font-weight:650}
    .layout{display:grid;grid-template-columns:744px 360px;gap:48px;margin:12px 48px 0}.screen{margin-top:52px;border:1px solid #44495b;border-radius:13px;overflow:hidden}.screen img{width:100%;height:auto}
    .popup{width:360px;border:1px solid #646075;border-radius:17px;overflow:hidden;box-shadow:0 20px 50px #080a1290}.popup img{width:100%;height:auto}.caption{font-size:14px;color:#adb5ca;margin-top:15px;text-align:center}
    .features{display:flex;gap:12px;margin-top:23px}.footer{margin:32px 48px;font-size:15px;color:#aeb6ca}
    </style><header><div><p class="pink" style="font-size:15px;letter-spacing:2px;margin-bottom:10px">速度由你选择</p><h1>2×、3×、4×，一键设定。</h1></div><div class="brand"><img src="${icon}">Hold Speed</div></header>
    <div class="layout"><div><div class="screen"><img src="${second}" alt="用户提供的实测视频画面"></div><div class="features"><span class="pill">按住加速</span><span class="pill">松开恢复</span><span class="pill">设置保存在本机</span></div></div><div><div class="popup"><img src="${settings}" alt="扩展实际设置界面"></div><p class="caption">点击浏览器工具栏中的扩展图标</p></div></div><p class="footer">暂停时也能用：按住右方向键临时播放，松开继续暂停。</p>`);

  await render("promo-small-440x280.png", 440, 280, `<!doctype html><meta charset="utf-8"><style>${base}
    body{background:radial-gradient(ellipse at 100% 0%,#5b284e,transparent 70%),#181e2f}.brand{position:absolute;top:17px;left:23px;font-size:19px}.brand img{width:43px;height:43px}.brand small{display:block;margin:2px 0 0;font-size:11px}
    .key{position:absolute;left:161px;top:81px;width:121px;height:104px;border-radius:22px;border:2px solid #ffd0e1;border-bottom:9px solid #be497a;background:#ff6398;color:#22182b;font:600 76px/91px 'Segoe UI';text-align:center;box-shadow:0 19px 40px #0b0c1b70}
    .line{position:absolute;height:5px;background:#ff83ac;border-radius:4px;left:66px}.rates{position:absolute;bottom:22px;left:94px;display:flex;gap:14px}.rates span{border:1px solid #6b556d;padding:8px 14px;border-radius:18px;color:#d2c9df;font-size:17px}.rates .active{border-color:#ff91b9;background:#ff6398;color:#24172a;font-weight:650}
    </style><div class="brand"><img src="${icon}"><div>Hold Speed<small>for YouTube</small></div></div><div class="line" style="top:102px;width:73px;opacity:.3"></div><div class="line" style="top:128px;width:56px;left:85px;opacity:.55"></div><div class="line" style="top:154px;width:83px;left:54px"></div><div class="key">→</div><div class="rates"><span>2×</span><span class="active">3×</span><span>4×</span></div>`);

  await render("promo-marquee-1400x560.png", 1400, 560, `<!doctype html><meta charset="utf-8"><style>${base}
    body{background:radial-gradient(ellipse at 95% 20%,#622c50,transparent 68%),#161d2c}.brand{position:absolute;top:47px;left:74px;font-size:27px}.brand img{width:65px;height:65px}.brand small{font-size:17px}
    h1{position:absolute;top:177px;left:80px;font-size:66px;font-weight:650;letter-spacing:-3px}.sub{position:absolute;top:283px;left:83px;font-size:23px;color:#b5bfd3}.rates{position:absolute;top:373px;left:83px;display:flex;gap:15px}.rates span{padding:14px 29px;border-radius:16px;font-size:29px;border:1px solid #58637a;color:#bec7da}.rates .selected{background:#ff6398;color:#251a2b;border-color:#ffa5c5}
    .key{position:absolute;top:135px;left:993px;width:251px;height:228px;border:3px solid #ffc7dc;border-bottom:18px solid #b74573;border-radius:42px;background:#ff6398;color:#281b2d;text-align:center;font:600 158px/207px 'Segoe UI';box-shadow:0 28px 80px #080b1780;transform:rotate(-7deg)}.line{position:absolute;height:8px;background:#ff8db5;border-radius:10px;left:767px}.note{position:absolute;bottom:39px;left:83px;font-size:14px;letter-spacing:.5px;color:#9faac1}
    </style><div class="brand"><img src="${icon}">Hold Speed<small>for YouTube</small></div><h1>按住，加速。<span class="pink">松开，恢复。</span></h1><p class="sub">播放中长按倍速 · 暂停时按住临时播放</p><div class="rates"><span>2×</span><span class="selected">3×</span><span>4×</span></div><div class="line" style="top:192px;width:170px;opacity:.28"></div><div class="line" style="top:254px;width:113px;left:826px;opacity:.52"></div><div class="line" style="top:317px;width:179px;left:751px"></div><div class="key">→</div><p class="note">仅在本机保存设置 · 无广告 · 无需额外账号</p>`);
  console.log(`Rendered store artwork to ${assetDir}`);
} finally {
  await context.close();
}
