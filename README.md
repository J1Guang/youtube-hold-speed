# Hold Speed for YouTube

**把熟悉的「长按右方向键倍速」带到 YouTube，支持 2× / 3× / 4×。**

轻量 Chrome Manifest V3 扩展，无运行时依赖、无需构建、不联网、不收集数据。

[下载扩展安装包](https://github.com/J1Guang/youtube-hold-speed/releases/latest) · [自动测试](https://github.com/J1Guang/youtube-hold-speed/actions) · [验证记录](docs/VALIDATION.md)

## 使用体验

| 操作 | 效果 |
| --- | --- |
| 播放时长按 `→`，约 300 毫秒 | 临时以所选速度播放，默认 **3×**，显示速度提示 |
| 松开 `→` | 恢复长按前的速度，包括 0.5×、1.5×、2× 等 |
| 短按 `→` | 松开时交还 YouTube，触发原来的快进（通常为 5 秒） |
| 暂停时按下 `→` | 立即按所选倍速临时播放；松开恢复暂停，不跳过 5 秒 |
| 点击工具栏的扩展图标 | 选择 **2× / 3× / 4×**，保存后下次按住生效 |
| `←`、`↑`、`↓` | 保留 YouTube 原有后退和音量操作 |
| `Ctrl / Alt / Shift / ⌘` + 方向键 | 保留原有组合快捷键 |
| 搜索框、评论框、播放器菜单中的方向键 | 保留原有编辑或导航操作 |

长按从原位置继续播放，不会先跳过 5 秒。2×、3×、4× 指绝对播放速度，而不是在当前速度上再乘倍数。设置仅保存在当前浏览器，不上传或云同步。

**v1.1.0 的暂停行为**：暂停时，右方向键按下即临时播放，松开回到暂停状态，短按也采用这一规则；播放中的短按仍然快进。失焦、切换标签页、视频暂停、站内切换视频、广告开始时会退出加速。广告和时长无限的直播不启用长按加速。

![倍速选择弹窗](store/assets/popup-preview.png)

## 安装到 Chrome

1. 下载项目 ZIP 并解压，或克隆本仓库。
2. 在 Chrome 地址栏输入 `chrome://extensions`。
3. 打开右上角的**开发者模式**。
4. 点击**加载已解压的扩展程序**，选择本项目中的 **`extension` 文件夹**（其中直接包含 `manifest.json`）。
5. 刷新已经打开的 YouTube 页面，播放视频并使用右方向键。

如果使用的是打包后的 `youtube-hold-speed-v1.1.0.zip`，解压后直接选择含 `manifest.json` 的那层目录。安装后请保留该目录，不要删除或移动。

更新代码后，在扩展管理页面点击重新加载，然后刷新 YouTube 标签页。以上流程依据 [Chrome 官方本地安装说明](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)。本项目尚未上架 Chrome 应用商店。

```sh
git clone https://github.com/J1Guang/youtube-hold-speed.git
```

## 实现与兼容范围

- 在 `document_start` 注册捕获阶段的键盘监听，先区分短按与长按。
- 短按在松开时向原目标重放一次 `keydown` / `keyup`，由 YouTube 显示原生快进效果；因此快进时机从按下变为松开，这是区分长按所需的变化。
- 长按临时修改当前 `HTMLVideoElement.playbackRate`，松开恢复先前值；不修改 `defaultPlaybackRate`。暂停起始的操作在可信按键事件内调用 `play()`，松开调用 `pause()`，并处理播放请求失败与快速松手。
- 通过 `chrome.storage.local` 保存一个 `boostRate` 偏好；新增 `storage` 权限仅用于保存设置。每次按住开始时确定该次使用的速度。
- 只匹配桌面版 `www.youtube.com` 和 `www.youtube-nocookie.com/embed/`，包括匹配这些地址的嵌入框架。键盘焦点需处于相应页面或播放器中。
- 对 YouTube 的播放器结构和键盘事件处理有依赖。YouTube 若改动 `.html5-video-player`、键盘事件信任检查或快捷键实现，可能需要更新扩展；同时使用键盘或倍速类扩展也可能发生冲突。
- 基于可见、已加载的播放器工作，兼容播放与暂停状态；不以后台视频、隐藏预览或无限时长直播为目标。

扩展权限和数据处理详见 [PRIVACY.md](PRIVACY.md)。本项目与 YouTube、Google、Bilibili 无官方关联。

## 开发与测试

运行要求：Node.js 22 或更新版本。普通安装用户不需要 Node.js。

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm run package
# 可选：重新生成图标与商店素材
npm run store:assets
```

打包产物位于 `dist/`，只包含 `extension/` 内的运行文件。依赖仅用于自动化测试和 ZIP 打包，不进入扩展。

自动化测试在真正安装扩展的浏览器中使用本地生成的媒体和模拟播放器页面，覆盖长按、原速恢复、暂停恢复、播放失败、键盘重复、短按、输入框、其他快捷键、导航、失焦、广告、三档设置保存及嵌入域名。测试不访问在线 YouTube；可见性事件和播放被拒绝的场景在无头浏览器的扩展隔离环境中模拟。项目使用者已确认 v1.0.0 在线可用并提供实测截图；新增暂停行为与设置功能的自动验证记录见 [VALIDATION.md](docs/VALIDATION.md)。

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
5. 暂停视频，按住右方向键应立即临时播放，松开后应继续暂停。
6. 在弹窗依次选择 2×、3×、4×，分别在播放和暂停状态测试；关闭并重新打开弹窗确认选择保留。

## 项目结构

```text
extension/          可直接加载的扩展
  manifest.json     网站范围与 Manifest V3 配置
  content.js        键盘交互、临时倍速和恢复逻辑
  popup.*           工具栏倍速设置界面
  icons/            扩展图标
tests/              浏览器集成测试与本地播放器页面
scripts/package.mjs 生成可分发的扩展 ZIP
.github/workflows/  自动测试与打包
store/              商店介绍、权限说明、原始截图、图标源文件与宣传素材
```

## English

Choose **2×, 3× or 4×** in the toolbar popup (default: 3×). While playing, hold **ArrowRight** for 300 ms to accelerate and release to restore the previous rate; a quick tap replays YouTube's normal seek on release. While paused, pressing ArrowRight starts temporary playback immediately and releasing pauses again. Other arrows, modified shortcuts and text input keep their native behavior. Ads and infinite-duration live streams are excluded.

Load the `extension/` directory as an unpacked extension at `chrome://extensions`, then refresh YouTube. No build or extra account is required. Only the speed preference is stored locally. Browser tests use local media and a simulated player; the project user confirmed the original version working on live YouTube.

## License

[MIT](LICENSE)
