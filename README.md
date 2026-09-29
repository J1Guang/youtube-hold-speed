# YouTube Hold Speed

**把 Bilibili 式的「长按右方向键三倍速」带到 YouTube。**

轻量 Chrome Manifest V3 扩展，无运行时依赖、无需构建、不联网、不收集数据。

[下载扩展安装包](https://github.com/J1Guang/youtube-hold-speed/releases/latest) · [自动测试](https://github.com/J1Guang/youtube-hold-speed/actions) · [验证记录](docs/VALIDATION.md)

## 使用体验

| 操作 | 效果 |
| --- | --- |
| 播放时长按 `→`，约 300 毫秒 | 临时以 **3×** 播放，显示速度提示 |
| 松开 `→` | 恢复长按前的速度，包括 0.5×、1.5×、2× 等 |
| 短按 `→` | 松开时交还 YouTube，触发原来的快进（通常为 5 秒） |
| `←`、`↑`、`↓` | 保留 YouTube 原有后退和音量操作 |
| `Ctrl / Alt / Shift / ⌘` + 方向键 | 保留原有组合快捷键 |
| 搜索框、评论框、播放器菜单中的方向键 | 保留原有编辑或导航操作 |

长按从原位置继续播放，不会先跳过 5 秒。3× 指绝对播放速度，而不是在当前速度上乘 3。

暂停时不自动播放或加速，方向键继续由 YouTube 处理。失焦、切换标签页、视频暂停、站内切换视频、广告开始时会退出加速。广告和时长无限的直播不启用长按加速。

## 安装到 Chrome

1. 下载项目 ZIP 并解压，或克隆本仓库。
2. 在 Chrome 地址栏输入 `chrome://extensions`。
3. 打开右上角的**开发者模式**。
4. 点击**加载已解压的扩展程序**，选择本项目中的 **`extension` 文件夹**（其中直接包含 `manifest.json`）。
5. 刷新已经打开的 YouTube 页面，播放视频并使用右方向键。

如果使用的是打包后的 `youtube-hold-speed-v1.0.0.zip`，解压后直接选择含 `manifest.json` 的那层目录。安装后请保留该目录，不要删除或移动。

更新代码后，在扩展管理页面点击重新加载，然后刷新 YouTube 标签页。以上流程依据 [Chrome 官方本地安装说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)。本项目尚未上架 Chrome 应用商店。

```sh
git clone https://github.com/J1Guang/youtube-hold-speed.git
```

## 实现与兼容范围

- 在 `document_start` 注册捕获阶段的键盘监听，先区分短按与长按。
- 短按在松开时向原目标重放一次 `keydown` / `keyup`，由 YouTube 显示原生快进效果；因此快进时机从按下变为松开，这是区分长按所需的变化。
- 长按仅临时修改当前 `HTMLVideoElement.playbackRate`，松开恢复先前值；不修改 `defaultPlaybackRate`。
- 只匹配桌面版 `www.youtube.com` 和 `www.youtube-nocookie.com/embed/`，包括匹配这些地址的嵌入框架。键盘焦点需处于相应页面或播放器中。
- 对 YouTube 的播放器结构和键盘事件处理有依赖。YouTube 若改动 `.html5-video-player`、键盘事件信任检查或快捷键实现，可能需要更新扩展；同时使用键盘或倍速类扩展也可能发生冲突。
- 基于可见、正在播放的播放器工作；不以后台视频、隐藏预览或无限时长直播为目标。

扩展权限和数据处理详见 [PRIVACY.md](PRIVACY.md)。本项目与 YouTube、Google、Bilibili 无官方关联。

## 开发与测试

运行要求：Node.js 22 或更新版本。普通安装用户不需要 Node.js。

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm run package
```

打包产物位于 `dist/`，只包含 `extension/` 内的运行文件。依赖仅用于自动化测试和 ZIP 打包，不进入扩展。

自动化测试在真正安装扩展的浏览器中使用本地生成的媒体和模拟播放器页面，覆盖长按、原速恢复、键盘重复、短按、输入框、其他快捷键、导航、失焦、广告以及嵌入域名。测试不访问在线 YouTube，也不能替代 YouTube 在线实播验收；可见性事件在无头浏览器的扩展隔离环境中模拟。

默认使用 Playwright 的 Chromium。如果无法下载，也可使用支持 `Extensions.loadUnpacked` 的本机新版 Chrome，在 PowerShell 中运行：

```powershell
$env:CHROME_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test
```

测试会创建独立的临时浏览器配置，不使用日常浏览器的账号或记录。GitHub Actions 自动运行检查、测试并上传扩展 ZIP。

### 在线手动验收

1. 在 YouTube 普通视频中分别测试短按、连续短按、长按以及长按后的松开。
2. 将原速度设置为 1.5× 或 2×，确认加速结束后恢复该值。
3. 测试搜索和评论光标、播放器音量、菜单、全屏、进度条及站内切换视频。
4. 加速时切换标签页或切出浏览器，回来后确认已恢复速度。

## 项目结构

```text
extension/          可直接加载的扩展
  manifest.json     网站范围与 Manifest V3 配置
  content.js        键盘交互、临时倍速和恢复逻辑
  icons/            扩展图标
tests/              浏览器集成测试与本地播放器页面
scripts/package.mjs 生成可分发的扩展 ZIP
.github/workflows/  自动测试与打包
```

## English

Hold **ArrowRight** for 300 ms to play YouTube at **3×** speed; release to restore the previous rate. A quick tap replays YouTube's normal seek on release. Other arrows, modified shortcuts and text input keep their native behavior. Paused videos, ads and infinite-duration live streams are left to YouTube.

Load the `extension/` directory as an unpacked extension at `chrome://extensions`, then refresh YouTube. No build, account or network permissions are required. Browser tests use local media and a simulated player; live YouTube compatibility needs manual verification.

## License

[MIT](LICENSE)
