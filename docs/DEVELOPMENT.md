# 开发与验证

[返回项目首页](../README.md) · [验证记录](VALIDATION.md) · [展示素材](../store/README.md)

## 开发环境

运行要求：Node.js 22 或更新版本。普通安装用户不需要 Node.js。

```sh
git clone https://github.com/J1Guang/youtube-hold-speed.git
cd youtube-hold-speed
npm ci
npx playwright install chromium
npm run check
npm test
npm run package
# 可选：重新生成图标与商店素材
npm run store:assets
```

打包产物位于 `dist/`，只包含 `extension/` 内的运行文件。依赖仅用于自动化测试、素材生成和 ZIP 打包，不进入扩展。运行扩展本身不需要构建。

默认使用 Playwright 的 Chromium。如果无法下载，也可使用支持 `Extensions.loadUnpacked` 的本机新版 Chrome，在 PowerShell 中运行：

```powershell
$env:CHROME_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test
# 生成素材时同样支持这个环境变量
npm run store:assets
```

测试会创建独立的临时浏览器配置，不使用日常浏览器的账号或记录。GitHub Actions 自动运行检查、测试并上传扩展 ZIP。

## 实现细节

- 在 `document_start` 注册捕获阶段的键盘监听，先区分短按与长按。
- 播放中的短按在松开时向原目标重放一次 `keydown` / `keyup`，由 YouTube 显示原生快进效果；因此快进时机从按下变为松开，这是区分长按所需的变化。
- 长按临时修改当前 `HTMLVideoElement.playbackRate`，松开恢复先前值，不修改 `defaultPlaybackRate`。暂停起始的操作在可信按键事件内调用 `play()`，松开调用 `pause()`，并处理播放请求失败与快速松手。
- 通过 `chrome.storage.local` 保存一个 `boostRate` 偏好；`storage` 权限仅用于保存设置。每次按住开始时确定该次使用的速度。
- 只匹配桌面版 `www.youtube.com` 和 `www.youtube-nocookie.com/embed/`，包括匹配这些地址的嵌入框架。键盘焦点需处于相应页面或播放器中。
- 对 YouTube 的播放器结构和键盘事件处理有依赖。YouTube 若改动 `.html5-video-player`、键盘事件信任检查或快捷键实现，可能需要更新扩展。
- 基于可见、已加载的播放器工作，兼容播放与暂停状态；不以后台视频、隐藏预览或无限时长直播为目标。

扩展权限和数据处理详见 [PRIVACY.md](../PRIVACY.md)。

## 自动化验证范围

自动化测试在真正安装扩展的浏览器中使用本地生成的媒体和模拟播放器页面，覆盖长按、原速恢复、暂停恢复、播放失败、键盘重复、短按、输入框、其他快捷键、导航、失焦、广告、三档设置保存及嵌入域名。

测试不访问在线 YouTube；可见性事件和播放被拒绝的场景在无头浏览器的扩展隔离环境中模拟。项目使用者已确认 v1.0.0 在线可用并提供实测截图；新增暂停行为与设置功能的自动验证记录见 [VALIDATION.md](VALIDATION.md)。

## 在线手动验收

1. 在 YouTube 普通视频中分别测试短按、连续短按、长按以及长按后的松开。
2. 将原速度设置为 1.5× 或 2×，确认加速结束后恢复该值。
3. 测试搜索和评论光标、播放器音量、菜单、全屏、进度条及站内切换视频。
4. 加速时切换标签页或切出浏览器，回来后确认已恢复速度。
5. 暂停视频，按住右方向键应立即临时播放，松开后应继续暂停；快速松手也应恢复暂停。
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
scripts/render-store.mjs 生成图标、截图排版及宣传图
docs/               开发说明与验证记录
.github/workflows/  自动测试与打包
store/              素材预览、商店文案和提交记录
  assets/           可直接使用的图标、截图和宣传图
  reference/        用户提供的原始实测画面
```
