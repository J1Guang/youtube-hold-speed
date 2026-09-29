(() => {
  "use strict";

  const HOLD_DELAY_MS = 300;
  const BOOST_RATE = 3;
  const CONTROL_SELECTOR = [
    "input", "textarea", "select", "[role='textbox']",
    "[role='combobox']", "[role='listbox']", "[role='menu']",
    "[role='menuitem']", "[role='menuitemradio']", "[role='menuitemcheckbox']",
    "[role='slider']:not(.ytp-progress-bar)",
    "[role='dialog']", "dialog", ".ytp-settings-menu", ".ytp-popup",
  ].join(",");

  let press = null;
  let ownsRightKey = false;
  let replaying = false;

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function isControl(element, player) {
    if (!(element instanceof Element)) return false;
    if (element.isContentEditable || element.closest(CONTROL_SELECTOR)) return true;
    const button = element.closest("a, button, [role='button']");
    return Boolean(button && !player.contains(button));
  }

  function isVisible(video) {
    const rect = video.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
      rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth &&
      getComputedStyle(video).visibility !== "hidden";
  }

  function canUseVideo(video, player) {
    return video.isConnected && player.isConnected && player.contains(video) &&
      !video.paused && !video.ended && video.readyState >= 1 &&
      Number.isFinite(video.duration) && video.duration > 0 &&
      !player.matches(".ad-showing, .ad-interrupting") && isVisible(video);
  }

  function findPlayer(event) {
    const path = event.composedPath();
    const focusedPlayer = path.find((node) =>
      node instanceof Element && node.matches(".html5-video-player"));
    const players = focusedPlayer ? [focusedPlayer] :
      [...document.querySelectorAll(".html5-video-player")];
    for (const player of players) {
      const video = player.querySelector("video.html5-main-video, video");
      if (!video || !canUseVideo(video, player)) continue;
      if (path.some((node) => isControl(node, player)) ||
          isControl(document.activeElement, player)) return null;
      return { video, player };
    }
    return null;
  }

  function stillValid(session) {
    let focused = document.activeElement;
    while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
    return document.visibilityState === "visible" &&
      location.href === session.url && session.video.currentSrc === session.source &&
      canUseVideo(session.video, session.player) &&
      !isControl(focused, session.player);
  }

  function showIndicator(session) {
    const host = document.createElement("div");
    host.dataset.ythsIndicator = "";
    host.style.cssText = "position:absolute;top:15%;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;pointer-events:none;user-select:none;";
    const shadow = host.attachShadow({ mode: "closed" });
    const badge = document.createElement("div");
    badge.textContent = "▶▶ 3×";
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-label", "3 倍速播放，松开右方向键恢复");
    badge.style.cssText = "padding:9px 17px;border-radius:999px;background:rgba(16,18,23,.88);" +
      "color:#fff;border:1px solid rgba(255,255,255,.2);font:600 17px/1.3 system-ui,sans-serif;" +
      "box-shadow:0 4px 20px rgba(0,0,0,.22);letter-spacing:1px;";
    shadow.append(badge);
    session.player.append(host);
    session.indicator = host;
  }

  function finish() {
    const session = press;
    press = null;
    if (!session) return;
    clearTimeout(session.timer);
    clearInterval(session.guard);
    session.observer?.disconnect();
    session.video.removeEventListener("pause", cancel);
    session.video.removeEventListener("ended", cancel);
    session.video.removeEventListener("emptied", cancel);
    session.video.removeEventListener("loadstart", cancel);
    session.indicator?.remove();
    if (session.boosted) {
      // Restore the actual pre-hold rate (including rates other than 1×).
      session.video.playbackRate = session.originalRate;
    }
  }

  function cancel() {
    // Keep ownership until keyup, so OS key-repeat cannot turn a cancelled hold
    // into an accidental series of seeks or boost the next video.
    finish();
  }

  function startBoost(session) {
    if (press !== session) return;
    if (!stillValid(session)) return cancel();
    session.originalRate = session.video.playbackRate;
    session.boosted = true;
    session.video.playbackRate = BOOST_RATE;
    showIndicator(session);
  }

  function replayTap(session) {
    const target = session.target?.isConnected ? session.target : session.player;
    replaying = true;
    try {
      // Let YouTube perform its own single-arrow seek and show its native HUD.
      // Both events are deferred until release; a long hold never seeks first.
      for (const type of ["keydown", "keyup"]) {
        target.dispatchEvent(new KeyboardEvent(type, {
          key: "ArrowRight", code: "ArrowRight", keyCode: 39, which: 39,
          bubbles: true, cancelable: true, composed: true, view: window,
        }));
      }
    } finally {
      replaying = false;
    }
  }

  function onKeyDown(event) {
    if (replaying) return;
    if (event.key !== "ArrowRight") {
      if (press && (hasModifier(event) || event.key === "Escape" || event.key === "Tab")) cancel();
      return;
    }
    if (ownsRightKey) {
      consume(event);
      if (hasModifier(event)) cancel();
      return;
    }
    if (event.repeat || event.defaultPrevented || hasModifier(event) ||
        event.isComposing || document.visibilityState !== "visible") return;
    const match = findPlayer(event);
    if (!match) return;

    consume(event);
    ownsRightKey = true;
    const session = {
      ...match,
      target: event.composedPath()[0],
      source: match.video.currentSrc,
      url: location.href,
      started: performance.now(),
      boosted: false,
      originalRate: match.video.playbackRate,
    };
    press = session;
    for (const type of ["pause", "ended", "emptied", "loadstart"]) {
      session.video.addEventListener(type, cancel);
    }
    // Observe only while the key is held; no background polling when idle.
    session.observer = new MutationObserver(() => {
      if (press === session && !stillValid(session)) cancel();
    });
    session.observer.observe(session.player, { attributes: true, attributeFilter: ["class"] });
    session.guard = setInterval(() => {
      if (!stillValid(session)) cancel();
    }, 100);
    session.timer = setTimeout(() => startBoost(session), HOLD_DELAY_MS);
  }

  function onKeyUp(event) {
    if (replaying || event.key !== "ArrowRight" || !ownsRightKey) return;
    consume(event);
    ownsRightKey = false;
    const session = press;
    const isTap = session && !session.boosted && !hasModifier(event) &&
      performance.now() - session.started < HOLD_DELAY_MS && stillValid(session);
    finish();
    if (isTap) replayTap(session);
  }

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", () => {
    cancel();
    ownsRightKey = false;
  });
  window.addEventListener("pagehide", () => {
    cancel();
    ownsRightKey = false;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      cancel();
      ownsRightKey = false;
    }
  });
  document.addEventListener("focusin", (event) => {
    if (press && event.composedPath().some(node => isControl(node, press.player))) cancel();
  }, true);
  document.addEventListener("yt-navigate-start", cancel, true);
  document.addEventListener("yt-navigate-finish", cancel, true);
})();
