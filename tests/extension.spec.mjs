import { test as base, expect, chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const extensionPath = fileURLToPath(new URL("../extension", import.meta.url));
const playerHTML = await readFile(new URL("./player.html", import.meta.url), "utf8");
// A local, finite media source exercises real HTMLMediaElement playback and rates.
const audio = Buffer.alloc(44 + 8000 * 120 * 2);
audio.write("RIFF", 0); audio.writeUInt32LE(audio.length - 8, 4);
audio.write("WAVEfmt ", 8); audio.writeUInt32LE(16, 16);
audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28);
audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34);
audio.write("data", 36); audio.writeUInt32LE(audio.length - 44, 40);

const test = base.extend({
  extensionContext: [async ({}, use) => {
    const installedChrome = process.env.CHROME_EXECUTABLE;
    const context = await chromium.launchPersistentContext("", {
      ...(installedChrome ? { executablePath: installedChrome } : { channel: "chromium" }),
      ignoreDefaultArgs: ["--disable-extensions"],
      headless: true,
      args: [
        "--enable-unsafe-extension-debugging",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });
    const cdp = await context.browser().newBrowserCDPSession();
    const { id } = await cdp.send("Extensions.loadUnpacked", { path: extensionPath });
    context.holdSpeedId = id;
    await cdp.detach();
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === "chrome-extension:") return route.continue();
      if (url.pathname === "/tone.wav") {
        await route.fulfill({ contentType: "audio/wav", body: audio });
      } else {
        await route.fulfill({ contentType: "text/html", body: playerHTML });
      }
    });
    await use(context);
    await context.close();
  }, { scope: "worker" }],
  page: async ({ extensionContext }, use) => {
    const settings = await extensionContext.newPage();
    await settings.goto(`chrome-extension://${extensionContext.holdSpeedId}/popup.html`);
    await settings.evaluate(() => chrome.storage.local.clear());
    await settings.close();
    const page = await extensionContext.newPage();
    await page.goto("https://www.youtube.com/watch?v=local-contract-fixture");
    await page.evaluate(() => window.ready);
    await use(page);
    await page.close();
  },
});

const rate = (page) => page.locator("video").evaluate(v => v.playbackRate);
const seeks = (page) => page.evaluate(() => window.nativeSeekCount);
async function hold(page, speed = 3) {
  await page.keyboard.down("ArrowRight");
  await expect(page.locator("[data-yths-indicator]")).toBeAttached();
  await expect.poll(() => rate(page)).toBe(speed);
}

async function openPopup(context) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${context.holdSpeedId}/popup.html`);
  await expect(popup.locator("#speed-options")).toBeEnabled();
  return popup;
}

async function chooseSpeed(context, page, speed) {
  const popup = await openPopup(context);
  await popup.locator(`label:has(input[value="${speed}"])`).click();
  await expect(popup.locator(`input[value="${speed}"]`)).toBeChecked();
  await expect(popup.locator("#speed-options")).toBeEnabled();
  expect(await popup.evaluate(() => chrome.storage.local.get({boostRate:3}))).toEqual({boostRate:speed});
  await popup.close();
  await page.bringToFront();
  await page.locator("#movie_player").focus();
}

test("a tap replays one native seek and a matching keyup", async ({ page }) => {
  await page.keyboard.press("ArrowRight");
  expect(await seeks(page)).toBe(1);
  expect(await page.locator("video").evaluate(v => v.currentTime)).toBeGreaterThanOrEqual(15);
  expect(await rate(page)).toBe(1);
  expect(await page.evaluate(() => window.nativeEvents.map(e => [e.type, e.key]))).toEqual([
    ["keydown", "ArrowRight"], ["keyup", "ArrowRight"],
  ]);
});

test("long hold changes to 3x without an initial seek and restores on release", async ({ page }) => {
  await hold(page);
  expect(await seeks(page)).toBe(0);
  await expect(page.locator("[data-yths-indicator]")).toBeAttached();
  await page.keyboard.up("ArrowRight");
  expect(await rate(page)).toBe(1);
  expect(await seeks(page)).toBe(0);
  await expect(page.locator("[data-yths-indicator]")).not.toBeAttached();
});

for (const original of [0.5, 1.5, 2, 3]) {
  test(`release restores the previous ${original}x rate`, async ({ page }) => {
    await page.locator("video").evaluate((v, value) => { v.playbackRate = value; }, original);
    await hold(page);
    await page.keyboard.up("ArrowRight");
    expect(await rate(page)).toBe(original);
  });
}

test("OS repeats never reach native seeking, before or after the hold threshold", async ({ page }) => {
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await expect.poll(() => rate(page)).toBe(3);
  for (let i = 0; i < 4; i++) await page.keyboard.down("ArrowRight");
  expect(await seeks(page)).toBe(0);
  await page.keyboard.up("ArrowRight");
  expect(await seeks(page)).toBe(0);
  expect(await rate(page)).toBe(1);
});

test("two rapid taps produce two native seeks", async ({ page }) => {
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  expect(await seeks(page)).toBe(2);
});

test("left, up and down keep native seeking and volume behavior", async ({ page }) => {
  await page.keyboard.press("ArrowLeft");
  expect(await seeks(page)).toBe(1);
  await page.keyboard.press("ArrowUp");
  expect(await page.locator("video").evaluate(v => v.volume)).toBeCloseTo(0.55);
  await page.keyboard.press("ArrowDown");
  expect(await page.locator("video").evaluate(v => v.volume)).toBeCloseTo(0.5);
  expect(await rate(page)).toBe(1);
  expect(await page.evaluate(() => window.nativeEvents.every(e => e.trusted))).toBe(true);
});

for (const selector of ["#search", "#comment", "#editor", "#outside", ".volume", "#shadow-input"]) {
  test(`right arrow remains untouched in ${selector}`, async ({ page }) => {
    await page.locator(selector).focus();
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(380);
    await page.keyboard.up("ArrowRight");
    expect(await rate(page)).toBe(1);
    expect(await page.evaluate(() => window.nativeEvents.filter(e => e.key === "ArrowRight")
      .every(e => e.trusted))).toBe(true);
  });
}

test("input cursor moves normally", async ({ page }) => {
  await page.locator("#search").focus();
  await page.locator("#search").evaluate(el => el.setSelectionRange(1, 1));
  await page.keyboard.press("ArrowRight");
  expect(await page.locator("#search").evaluate(el => el.selectionStart)).toBe(2);
});

test("player menus keep native right-arrow handling", async ({ page }) => {
  await page.locator(".ytp-settings-menu").evaluate(el => { el.hidden = false; });
  await page.locator("#setting").focus();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(380);
  await page.keyboard.up("ArrowRight");
  expect(await rate(page)).toBe(1);
  expect(await page.evaluate(() => window.nativeEvents[0].trusted)).toBe(true);
});

test("progress bar still supports a tap and a hold", async ({ page }) => {
  await page.locator(".ytp-progress-bar").focus();
  await page.keyboard.press("ArrowRight");
  expect(await seeks(page)).toBe(1);
  await hold(page);
  await page.keyboard.up("ArrowRight");
  expect(await seeks(page)).toBe(1);
});

for (const modifier of ["Control", "Alt", "Meta", "Shift"]) {
  test(`${modifier}+Right is never intercepted`, async ({ page }) => {
    await page.keyboard.press(`${modifier}+ArrowRight`);
    expect(await rate(page)).toBe(1);
    expect(await page.evaluate(() => window.nativeEvents.filter(e => e.key === "ArrowRight")
      .every(e => e.trusted))).toBe(true);
  });
}

test("paused video plays immediately while held and returns to pause on release", async ({ page }) => {
  await page.locator("video").evaluate(v => v.pause());
  const before = await page.locator("video").evaluate(v => v.currentTime);
  await page.keyboard.down("ArrowRight");
  expect(await rate(page)).toBe(3);
  expect(await page.locator("video").evaluate(v => v.paused)).toBe(false);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(380);
  await page.keyboard.up("ArrowRight");
  expect(await seeks(page)).toBe(0);
  expect(await rate(page)).toBe(1);
  expect(await page.locator("video").evaluate(v => v.paused)).toBe(true);
  const after = await page.locator("video").evaluate(v => v.currentTime);
  expect(after).toBeGreaterThan(before);
  expect(after).toBeLessThan(before + 4);
});

test("a quick tap on paused video never seeks or leaves playback running", async ({ page }) => {
  await page.locator("video").evaluate(v => { v.pause(); v.playbackRate = 1.5; });
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  expect(await seeks(page)).toBe(0);
  expect(await rate(page)).toBe(1.5);
  expect(await page.locator("video").evaluate(v => v.paused)).toBe(true);
  await expect(page.locator("[data-yths-indicator]")).not.toBeAttached();
});

for (const kind of ["blur", "navigate", "focus", "pause"]) {
  test(`paused-origin hold restores pause on ${kind}`, async ({ page }) => {
    await page.locator("video").evaluate(v => { v.pause(); v.playbackRate = 0.5; });
    await hold(page);
    await page.evaluate(kind => {
      if (kind === "blur") window.dispatchEvent(new Event("blur"));
      if (kind === "navigate") document.dispatchEvent(new Event("yt-navigate-start"));
      if (kind === "focus") document.querySelector("#search").focus();
      if (kind === "pause") document.querySelector("video").pause();
    }, kind);
    await expect.poll(() => rate(page)).toBe(0.5);
    expect(await page.locator("video").evaluate(v => v.paused)).toBe(true);
    await page.keyboard.up("ArrowRight");
    expect(await seeks(page)).toBe(0);
  });
}

for (const speed of [2, 3, 4]) {
  for (const paused of [false, true]) {
    test(`popup ${speed}x applies to ${paused ? "paused" : "playing"} video without a reload`, async ({ page, extensionContext }) => {
      await chooseSpeed(extensionContext, page, speed);
      await page.locator("video").evaluate((v, paused) => {
        v.playbackRate = 1.5;
        if (paused) v.pause();
      }, paused);
      await hold(page, speed);
      await page.keyboard.up("ArrowRight");
      expect(await rate(page)).toBe(1.5);
      expect(await page.locator("video").evaluate(v => v.paused)).toBe(paused);
      expect(await seeks(page)).toBe(0);
    });
  }
}

test("saved speed survives reopening the popup and reloading YouTube", async ({ page, extensionContext }) => {
  await chooseSpeed(extensionContext, page, 4);
  const popup = await openPopup(extensionContext);
  await expect(popup.locator('input[value="4"]')).toBeChecked();
  expect(await popup.evaluate(() => chrome.storage.local.get(null))).toEqual({boostRate:4});
  await popup.close();
  await page.reload();
  await page.evaluate(() => window.ready);
  await hold(page, 4);
  await page.keyboard.up("ArrowRight");
});

test("invalid stored speed falls back to 3x", async ({ page, extensionContext }) => {
  const popup = await openPopup(extensionContext);
  await popup.evaluate(() => chrome.storage.local.set({boostRate:99}));
  await popup.reload();
  await expect(popup.locator('input[value="3"]')).toBeChecked();
  await popup.close();
  await page.bringToFront();
  await page.locator("#movie_player").focus();
  await hold(page);
  await page.keyboard.up("ArrowRight");
});

test("popup radios are keyboard accessible", async ({ page, extensionContext }) => {
  const popup = await openPopup(extensionContext);
  await popup.locator('input[value="3"]').focus();
  await popup.keyboard.press("ArrowRight");
  await expect(popup.locator('input[value="4"]')).toBeChecked();
  await expect(popup.locator("#save-status")).toContainText("已保存 4×");
  await popup.close();
});

test("rejected play request restores rate and pause without an unhandled error", async ({ page, extensionContext }) => {
  await page.locator("video").evaluate(v => v.pause());
  const cdp = await extensionContext.newCDPSession(page);
  const worlds = [];
  cdp.on("Runtime.executionContextCreated", ({context}) => worlds.push(context));
  await cdp.send("Runtime.enable");
  const extensionWorld = worlds.find(world => world.origin.startsWith("chrome-extension://"));
  await cdp.send("Runtime.evaluate", {
    contextId: extensionWorld.id,
    expression: "HTMLMediaElement.prototype.play = function() { return Promise.reject(new DOMException('Blocked', 'NotAllowedError')); };",
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.keyboard.down("ArrowRight");
  await expect.poll(() => rate(page)).toBe(1);
  await page.keyboard.up("ArrowRight");
  expect(await page.locator("video").evaluate(v => v.paused)).toBe(true);
  expect(await seeks(page)).toBe(0);
  await expect(page.locator("[data-yths-indicator]")).not.toBeAttached();
  expect(errors).toEqual([]);
  await cdp.detach();
});

for (const kind of ["blur", "pagehide", "navigate", "pause", "focus", "shadow-focus", "ad", "removed", "source"]) {
  test(`${kind} cancels a hold and restores speed`, async ({ page }) => {
    await hold(page);
    await page.evaluate((kind) => {
      window.oldVideo = document.querySelector("video");
      if (kind === "blur" || kind === "pagehide") window.dispatchEvent(new Event(kind));
      if (kind === "navigate") document.dispatchEvent(new Event("yt-navigate-start"));
      if (kind === "pause") window.oldVideo.pause();
      if (kind === "focus") document.querySelector("#search").focus();
      if (kind === "shadow-focus") document.querySelector("#shadow-host").shadowRoot.querySelector("input").focus();
      if (kind === "ad") document.querySelector("#movie_player").classList.add("ad-showing");
      if (kind === "removed") window.oldVideo.remove();
      if (kind === "source") window.oldVideo.src = "/replacement.wav";
    }, kind);
    await expect.poll(() => page.evaluate(() => window.oldVideo.playbackRate)).toBe(1);
    await expect(page.locator("[data-yths-indicator]")).not.toBeAttached();
    await page.keyboard.down("ArrowRight");
    await page.keyboard.up("ArrowRight");
    expect(await seeks(page)).toBeLessThanOrEqual(1);
  });
}

test("navigation during the pending tap never seeks the next video", async ({ page }) => {
  await page.keyboard.down("ArrowRight");
  await page.evaluate(() => document.dispatchEvent(new Event("yt-navigate-start")));
  await page.keyboard.up("ArrowRight");
  expect(await seeks(page)).toBe(0);
  expect(await rate(page)).toBe(1);
});

test("visibility change cancels a hold even without a keyup", async ({ page, extensionContext }) => {
  await hold(page);
  const cdp = await extensionContext.newCDPSession(page);
  const worlds = [];
  cdp.on("Runtime.executionContextCreated", ({ context }) => worlds.push(context));
  await cdp.send("Runtime.enable");
  const extensionWorld = worlds.find(world => world.origin.startsWith("chrome-extension://"));
  expect(extensionWorld).toBeTruthy();
  // Headless tabs remain visible. Simulate visibility in the extension's actual
  // isolated world; a main-world JS override would not exercise the listener.
  await cdp.send("Runtime.evaluate", {
    contextId: extensionWorld.id,
    expression: "Object.defineProperty(document, 'visibilityState', {value:'hidden', configurable:true}); document.dispatchEvent(new Event('visibilitychange'));",
  });
  expect(await rate(page)).toBe(1);
  await expect(page.locator("[data-yths-indicator]")).not.toBeAttached();
  await cdp.detach();
});

test("left and volume arrows still work during a right-arrow hold", async ({ page }) => {
  await hold(page);
  await page.keyboard.press("ArrowLeft");
  expect(await seeks(page)).toBe(1);
  await page.keyboard.press("ArrowUp");
  expect(await page.locator("video").evaluate(v => v.volume)).toBeCloseTo(0.55);
  expect(await rate(page)).toBe(3);
  await page.keyboard.up("ArrowRight");
  expect(await rate(page)).toBe(1);
});

test("modifier pressed during a hold restores speed without seeking", async ({ page }) => {
  await hold(page);
  await page.keyboard.down("Shift");
  expect(await rate(page)).toBe(1);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Shift");
  expect(await seeks(page)).toBe(0);
});

test("ad playback is left to YouTube", async ({ page }) => {
  await page.locator("#movie_player").evaluate(el => el.classList.add("ad-showing"));
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(380);
  await page.keyboard.up("ArrowRight");
  expect(await rate(page)).toBe(1);
  expect(await page.evaluate(() => window.nativeEvents[0].trusted)).toBe(true);
});

test("infinite-duration live streams retain native arrows", async ({ page }) => {
  await page.locator("video").evaluate(async v => {
    const canvas = document.createElement("canvas");
    canvas.getContext("2d").fillRect(0, 0, 300, 150);
    v.srcObject = canvas.captureStream(10);
    await v.play();
  });
  expect(await page.locator("video").evaluate(v => v.duration)).toBe(Infinity);
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => window.nativeEvents[0].trusted)).toBe(true);
});

test("offscreen players do not capture the right arrow", async ({ page }) => {
  await page.locator("#movie_player").evaluate(el => { el.style.marginTop = "2000px"; });
  await page.keyboard.press("ArrowRight");
  expect(await page.evaluate(() => window.nativeEvents[0].trusted)).toBe(true);
});

test("extension is not injected on unrelated websites", async ({ page }) => {
  await page.goto("https://example.com/watch");
  await page.evaluate(() => window.ready);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(380);
  await page.keyboard.up("ArrowRight");
  expect(await rate(page)).toBe(1);
  expect(await page.evaluate(() => window.nativeEvents[0].trusted)).toBe(true);
});

test("privacy-enhanced YouTube embeds receive the extension", async ({ page }) => {
  await page.goto("https://www.youtube-nocookie.com/embed/fixture");
  await page.evaluate(() => window.ready);
  await hold(page);
  await page.keyboard.up("ArrowRight");
  expect(await rate(page)).toBe(1);
});
