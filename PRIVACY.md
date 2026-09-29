# Hold Speed for YouTube — 隐私政策 / Privacy Policy

生效日期 / Effective date：2026-09-30

适用版本 / Applies to：1.1.0 及后续沿用本政策的版本

开发者 / Developer：J1Guang

## 中文

### 功能与本地处理

本扩展为 YouTube 提供“按住右方向键临时加速”的播放控制功能，可选择 2×、3×、4×。暂停时，按住右方向键临时播放，松开恢复暂停。

为实现该功能，扩展在匹配的 YouTube 页面中本地处理方向键及相关修饰键事件，读取当前播放器的播放状态、播放速度、媒体源标识和当前页面地址，并临时调整视频元素。页面地址和媒体源仅用于确认按键期间是否切换了视频；这些运行状态仅在内存中临时使用，不建立观看历史或按键记录，不保存或上传视频信息、页面地址或键盘事件。

扩展不读取搜索框、评论框等输入区域的文字内容，不收集姓名、邮箱、账号、密码、支付信息、浏览历史或广告标识符。

### 保存的设置

扩展仅使用 `chrome.storage.local` 保存一个倍速偏好：`boostRate`，取值为 2、3 或 4，默认值为 3。设置保留在当前浏览器配置中，直到你更改设置、清除扩展数据或卸载扩展；不使用 `chrome.storage.sync`，不会由本扩展同步至其他设备或服务器。

### 权限说明

- **storage**：记住你选择的长按倍速，并使已打开的 YouTube 页面在下一次按住时使用新设置。
- **YouTube 页面访问**：内容脚本仅匹配 `https://www.youtube.com/*` 与 `https://www.youtube-nocookie.com/embed/*`，用于访问播放器、响应方向键并显示临时倍速提示，也适用于匹配这些地址的嵌入框架。
- 扩展不申请 cookies、history、tabs、webRequest 等权限。

### 数据共享与网络

扩展没有开发者服务器、统计分析、广告、遥测或远程执行代码，不向开发者或第三方出售、共享或传输上述设置与运行数据。点击扩展中的项目主页或隐私链接会由浏览器打开 GitHub；你在 GitHub 上的活动适用 GitHub 自身的隐私政策。

本扩展对用户数据的处理遵循 Chrome Web Store 用户数据政策，包括 Limited Use（限制使用）要求。信息仅用于上述播放控制功能，不用于广告、出售、信用评估或其他无关目的。

### 你的控制权

你可以随时在扩展弹窗选择倍速，在 Chrome 扩展管理页面停用或卸载扩展，并管理其网站访问权限。卸载扩展会删除扩展保存的本地偏好。

### 联系与变更

隐私问题可通过 [GitHub Issues](https://github.com/J1Guang/youtube-hold-speed/issues) 联系开发者。公开问题中请勿填写密码或其他敏感信息。政策有实质变更时，会更新本页面的生效日期，并按商店要求披露数据处理变化。

本扩展是独立第三方项目，与 YouTube、Google 或 Bilibili 无官方关联。

## English

### Purpose and local processing

Hold Speed for YouTube adds temporary playback acceleration while ArrowRight is held, at 2×, 3× or 4×. On a paused video, pressing the key starts temporary playback; releasing it pauses the video again.

To provide this feature, the extension locally handles arrow-key and related modifier-key events, checks the current player's playback state, playback rate, media source identifier and page URL, and temporarily adjusts the video element. The URL and source identifier are used only to detect a video change during a key hold. These runtime values are used transiently in memory. The extension does not create viewing-history or keystroke logs, or persist or transmit video information, page URLs or keyboard events.

It does not read text entered into search, comment or other editable fields, and does not collect names, email addresses, accounts, passwords, payment information, browsing history or advertising identifiers.

### Stored preference

The extension stores only `boostRate`, with a value of 2, 3 or 4 (default: 3), using `chrome.storage.local`. It stays in the current browser profile until changed, extension data is cleared or the extension is uninstalled. The extension does not use `chrome.storage.sync` or synchronize this preference to other devices or servers.

### Permissions

- **storage**: remember your chosen speed and apply changes to the next key hold in open YouTube pages.
- **YouTube site access**: content scripts match only `https://www.youtube.com/*` and `https://www.youtube-nocookie.com/embed/*`, including matching embedded frames, to access the player, handle the shortcut and display the temporary speed indicator.
- No cookies, history, tabs or webRequest permission is requested.

### Sharing and network use

There are no developer servers, analytics, ads, telemetry or remotely executed code. The extension does not sell, share or transmit the preference or runtime data to its developer or third parties. Project and privacy links open GitHub when clicked; activity on GitHub is governed by GitHub's privacy policy.

Use of user data follows the Chrome Web Store User Data Policy, including its Limited Use requirements. Information is used only for the playback controls described here, never for advertising, sale, credit assessment or unrelated purposes.

### Your choices and contact

You can change the speed in the popup, manage site access, disable the extension or uninstall it using Chrome's extension settings. Uninstalling removes the stored local preference.

For privacy questions, contact J1Guang through [GitHub Issues](https://github.com/J1Guang/youtube-hold-speed/issues). Do not post passwords or sensitive information in public issues. Material changes to this policy will be reflected in the effective date and disclosed as required by store policies.

This is an independent project, not affiliated with YouTube, Google or Bilibili.
