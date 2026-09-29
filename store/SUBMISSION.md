# Chrome Web Store 提交材料 — v1.1.0

开发者已确认注册并缴费。本目录保存商店素材；**上传扩展时请使用 `dist/youtube-hold-speed-v1.1.0.zip`，不要上传整个源码或素材包。**

## 商店字段

- 名称：Hold Speed for YouTube · 长按倍速（来自 Manifest）。
- 默认语言：简体中文。
- 类别建议：工具 / 提高效率（按后台实际提供的分类选择）。
- 详细介绍：`description.zh-CN.txt`；英文备用介绍：`description.en.txt`。
- 图标：`assets/icon-128.png`（128×128，透明边距）。
- 截图 1：`assets/screenshot-01-playback-1280x800.png`。
- 截图 2：`assets/screenshot-02-settings-1280x800.png`。
- 小宣传图：`assets/promo-small-440x280.png`。
- 大宣传图：`assets/promo-marquee-1400x560.png`，可选。
- 主页：https://github.com/J1Guang/youtube-hold-speed
- 支持：https://github.com/J1Guang/youtube-hold-speed/issues
- 隐私政策：https://github.com/J1Guang/youtube-hold-speed/blob/main/PRIVACY.md

`assets/popup-preview.png` 是实际设置弹窗预览，尺寸非商店截图规格，勿作为独立商店截图上传。

## 隐私与审核

`privacy-fields.zh-CN.txt` 包含可直接填写的单一用途、storage 与网站访问理由、远程代码说明及审核测试步骤。扩展不上传或收集用户数据，只有一个本地偏好值；按实际代码和隐私政策完成后台声明。

应用内界面为简体中文，英文介绍已如实说明。已有的 GitHub 账号登录不能代替 Google 开发者后台登录。账户身份、安全验证、付款及开发者联系信息由账号所有者完成。

## 提交顺序

1. 上传扩展 ZIP；检查版本显示为 1.1.0。
2. 填写商店介绍、类别和语言，上传图标、两张截图与小宣传图。
3. 填写隐私说明和权限理由，提供公开隐私政策链接。
4. 使用注册账号已有的开发者联系信息，并完成后台要求的账号验证。
5. 检查分发可见性与地区后提交审核；提交成功不等于已通过审核或已公开上架。

## 素材来源与再生成

- `reference/`：用户提供的两张 YouTube 实测截图，保留画面原样。
- `icon.svg`：原创图标的矢量源文件。
- `assets/`：商店成品图；截图使用原始视频画面和实际设置弹窗，不伪造播放内容。
- 再生成：在已安装开发依赖和 Chromium 的环境运行 `npm run store:assets`；也可设置 `CHROME_EXECUTABLE` 使用本机 Chrome。
- 视频画面的内容权利归其各自权利人，不纳入本项目原创代码的 MIT 授权声明。

官方依据：[发布流程](https://developer.chrome.com/docs/webstore/publish)、[图像要求](https://developer.chrome.com/docs/webstore/images)、[隐私字段](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)。
