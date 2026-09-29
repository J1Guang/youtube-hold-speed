"use strict";

const controls = document.querySelector("#speed-options");
const status = document.querySelector("#save-status");
const allowedRates = [2, 3, 4];
let savedRate = 3;

function selectRate(value) {
  savedRate = allowedRates.includes(value) ? value : 3;
  document.querySelector(`input[value="${savedRate}"]`).checked = true;
}

function showStatus(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get({ boostRate: 3 });
    selectRate(settings.boostRate);
    showStatus(`当前 ${savedRate}× · 下次按住右方向键时生效`);
  } catch {
    showStatus("未能读取设置，请重新打开此窗口。", true);
  } finally {
    controls.disabled = false;
  }
}

controls.addEventListener("change", async (event) => {
  const value = Number(event.target.value);
  if (!allowedRates.includes(value)) return;
  controls.disabled = true;
  try {
    await chrome.storage.local.set({ boostRate: value });
    selectRate(value);
    showStatus(`已保存 ${value}× · 下次按住右方向键时生效`);
  } catch {
    selectRate(savedRate);
    showStatus("保存失败，请重试。", true);
  } finally {
    controls.disabled = false;
  }
});

loadSettings();
