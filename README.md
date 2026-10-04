# 双语字幕导出助手 · Bilingual Subtitle Exporter

把 YouTube / Bilibili 视频已有的字幕一键导出为字幕文件。免费版导出 TXT；Pro 解锁 SRT / VTT / ASS、双语对照导出与批量导出。

A Firefox extension that exports the subtitles a YouTube / Bilibili video already has. Free: TXT export. Pro: SRT / VTT / ASS export, bilingual (two-track) export, and batch export of all tracks.

## 功能 / Features

- 读取当前视频页面的字幕轨道列表（YouTube 含自动生成字幕轨道，标注 ASR；Bilibili 含 AI 字幕与上传字幕）
- 免费：导出 TXT 纯文本（自动合并自动字幕的滚动重复行）
- Pro：
  - 导出 SRT / WebVTT / ASS 字幕文件
  - 双语对照：任选两条轨道，按时间轴合并为双行字幕
  - 批量导出：一次导出全部轨道
- 中 / 英双语界面（设置页可切换，或跟随浏览器语言）
- 全部处理在本地完成，不上传任何数据（manifest 已声明 `data_collection_permissions: none`）

Reads the subtitle track list of the current video (YouTube ASR tracks are marked; Bilibili AI and uploaded subtitles are both listed), exports TXT for free, and — with Pro — SRT / WebVTT / ASS files, two-track bilingual files merged by timestamp, and batch export of every track. Interface in Chinese and English. Everything is processed locally; nothing is uploaded.

## 安装 / Install

- Firefox 附加组件商店（AMO）：上架准备中。
- 临时加载：`about:debugging` → 本机 Firefox → 临时载入附加组件 → 选择本仓库的 `manifest.json`。

AMO listing is in preparation. For a temporary install: `about:debugging` → This Firefox → Load Temporary Add-on → pick this repo's `manifest.json`.

## Pro 激活 / Activating Pro

Pro 激活码在爱发电购买（商品页即将上线）。在插件的「设置」页输入激活码（形如 `BSEP-XXXXXX-XXXXXX-XXXXXX`）即可开启 Pro 功能。激活校验完全离线进行。

Buy a license key on Afdian (product page coming soon), then enter it on the extension's Settings page (`BSEP-XXXXXX-XXXXXX-XXXXXX`). Validation is fully offline.

## 原理 / How it works

- YouTube：读取页面播放器数据中的字幕轨道列表，取轨道自带的 timedtext 地址并以 `fmt=json3` 拉取、解析。
- Bilibili：通过公开的播放器接口（`/x/player/wbi/v2`）读取字幕列表，再拉取接口返回的字幕 JSON。
- 只处理视频页面本身已加载/已提供的字幕轨道，不下载视频、不绕过任何付费或 DRM 机制。

YouTube: reads the caption track list from the page's player data and fetches the track's own timedtext URL as `fmt=json3`. Bilibili: reads the subtitle list from the public player API (`/x/player/wbi/v2`) and fetches the subtitle JSON it returns. Only tracks the page itself provides are handled — no video downloading, no DRM or paywall circumvention.

## 开发 / Development

原生 JavaScript、MV3、无构建工具，直接载入仓库目录即可运行。

Vanilla JavaScript, MV3, no build step — load the repo directory as-is.

自测 / Tests：

```bash
node tests/run-tests.cjs          # 38 项：解析 / 转换 / 双语合并 / 激活码 / manifest 结构
npx web-ext lint --source-dir .   # Mozilla 官方校验：0 errors / 0 warnings
```

## 许可 / License

MIT（见 `LICENSE`）。字幕获取方式参考了两个 MIT 项目的公开实现思路（接口路径与数据结构），本仓库代码为独立编写：

Approach references (API endpoints and data shapes), code written independently:

- [IndieKKY/bilibili-subtitle](https://github.com/IndieKKY/bilibili-subtitle) (MIT)
- [devhims/youtube-caption-extractor](https://github.com/devhims/youtube-caption-extractor) (MIT)
