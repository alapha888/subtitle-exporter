# DEVLOG — 双语字幕导出助手 v1

日期：2026-10-04。状态：v1 本体完成并通过自测与 Mozilla 官方 lint；未做真实浏览器实测（见「已知缺口」）。

## 1. 轮子筛选（动手前置，按规矩执行）

在 GitHub 以 subtitle downloader/exporter extension、bilibili subtitle、youtube captions 等词检索，按更新时间 / Stars / 许可证 / 技术栈筛出 3 个最相关候选：

| 候选 | Stars | 许可证 | 技术栈 | 最近代码推送 | 结论 |
|---|---|---|---|---|---|
| IndieKKY/bilibili-subtitle | ★1181 | MIT | TypeScript + Vite + Tailwind + React（重构建链） | 2025-11-04 | **参考其 Bilibili 接口路径**（`/x/player/wbi/v2?aid&cid` → `data.subtitle.subtitles[].subtitle_url`，过滤空 url；配合 `/x/web-interface/view` 取 aid/cid）。代码为 TS+构建产物，与本任务「原生 JS、无构建工具」约束冲突，不整体复用 |
| devhims/youtube-caption-extractor | ★168 | MIT | TypeScript 库（Node 向，非插件，jest/vitest） | 2026-09-17 | **参考其 YouTube 提取路径**（`ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks[].baseUrl` + `&fmt=json3`）。是库不是插件，且 TS 需构建，不整体复用 |
| ADengrc/youtube-captions | ★251 | MIT | 纯 JavaScript 插件（YouTube 中英双字幕） | 2020-06-12 | 概念最接近（双语），但代码停在 2020 年（MV2 时代、旧 DOM），不可用；仅作概念参照 |

排除项：algolia/youtube-captions-scraper（★335）无许可证，不可复用代码；其余检索结果多为 ★<50 或非插件形态。

**决策**：没有一个轮子能在「原生 JS + MV3 + 无构建」约束下整体采用。采用两个 MIT 项目验证过的**接口路径与数据结构**（已实际克隆读源确认：IndieKKY 的 `src/inject/inject.ts` 与 devhims 的 `src/index.ts`），插件代码全部用原生 JS 独立编写，README 已注明出处。实际复用的是「路径」而非「代码」，这是本约束下的最优解。

## 2. 实现记录

结构（无构建，直接载入）：

- `manifest.json`：MV3；`background.scripts`（Firefox 风格）；action popup；options_ui；三组 content_scripts（YouTube MAIN 世界桥 + YouTube 隔离脚本 + Bilibili 隔离脚本）；host_permissions 仅限 youtube/bilibili/api.bilibili.com/hdslb.com；`data_collection_permissions: {required:["none"]}` 如实声明零数据收集；strict_min_version 140（data_collection_permissions 与 MAIN world 均需较新版本）。
- `src/inject/yt-main.js`（MAIN 世界）：读 `window.ytInitialPlayerResponse` 的 captionTracks，经 CustomEvent（JSON 字符串）回传隔离脚本。
- `src/content/youtube.js`：桥接超时 900ms 无响应时**降级解析 watch 页 HTML** 中的 `"captionTracks":[...]`（括号配平截取）；取轨时给 baseUrl 追加 `fmt=json3` 拉取并解析。
- `src/content/bilibili.js`：URL 取 bvid 与分 P 参数 → `web-interface/view` 取 aid/当前 P 的 cid → `player/wbi/v2`（失败降级 `player/v2`）取字幕列表 → 拉 subtitle_url 的 JSON。请求均带 `credentials:'include'`，在用户浏览器内以其自身会话发出（与 B 站网页播放器同路径）。
- `src/lib/converter.js`：纯函数库（UMD，浏览器/Node 双用）。cue 模型 `{start,end,text}`（秒）。Bilibili body `{from,to,content}`、YouTube json3 `events[].segs[].utf8` 两个解析器；TXT（连续重复行合并，处理 ASR 滚动字幕）/ SRT / VTT / ASS 序列化；`mergeBilingual` 按时间重叠把第二轨文本并入主轨为第二行；文件名清洗。
- `src/lib/license.js` + 隐藏生成器：独立方案——前缀 `BSEP`、32 字符自定义字母表（无 I/L/O/1）、独立 SECRET、校验和为 FNV-1a(payload + '|' + SECRET) 取 30 bit。与 MD 排版助手的 MDPE 方案仅结构同构，密钥/字母表/前缀/哈希输入顺序全不同；生成器在 goal hidden_files（0600），发码日志单独落盘。自测含「MDPE 密钥必须被拒绝」的独立性断言。
- 免费/Pro 分界：TXT 免费；SRT/VTT/ASS、双语、批量均在 popup 动作入口校验 Pro，未激活时提示并打开设置页激活。购买链接为 `src/lib/config.js` 的 `TODO_BUY_URL` 常量占位（非 http 值时 UI 显示「即将上线」并禁用）——**没有**指向任何其他产品的爱发电页面。
- i18n：`_locales`（en 默认 + zh_CN）负责 manifest 名称/描述；运行时字典 `src/lib/i18n.js` 负责 popup/options 全部文案，设置页可切换 auto/zh/en。

## 3. 自测结果（2026-10-04 实测输出）

- `node tests/run-tests.cjs`：**38 passed, 0 failed**。覆盖：两解析器（含 json3 中 window-style 无 segs 事件被跳过、多 seg 拼接）、SRT/VTT/ASS 时间格式与首块内容精确断言、双语合并结果逐字断言、文件名清洗、激活码往返（生成器实发密钥可校验 / 小写粘贴可校验 / 去横线可校验 / 篡改一位被拒 / MDPE 密钥被拒）、manifest 结构与全部引用文件存在性、popup/options 的 script 引用可达。
- `npx web-ext lint`（Mozilla 官方校验）：**0 errors / 0 notices / 0 warnings**（迭代修复了 data_collection_permissions 缺失及其最低版本连带警告）。
- `web-ext build` 可正常打包（zip 24KB）。
- 转换演示（样本→双语 SRT 前两条，与样本时间轴 0.62–3.41 / 3.41–6.08 对齐）：

```
1
00:00:00,620 --> 00:00:03,410
大家好，欢迎来到本期视频
Hello everyone, welcome back

2
00:00:03,410 --> 00:00:06,080
今天我们来聊聊字幕导出
Today we talk about subtitle export
```

- 样本说明：本机（数据中心 IP）调 Bilibili view 接口返回 412 风控页，无法从 shell 直抓真实字幕 JSON；样本按两个参考项目源码中的真实格式构造（Bilibili `body[{from,to,content}]`、YouTube json3 `events[{tStartMs,dDurationMs,segs[{utf8}]}]`）。插件在真实浏览器中从 bilibili.com 页面发出带 cookie 的同源请求，与 shell 环境不同——此差异即「已知缺口」第 1 条。

## 4. 已知缺口 / 还差什么（如实）

1. **未做真实浏览器端到端实测**：YouTube 桥接、HTML 降级解析、Bilibili wbi/v2 在登录态下的实际返回，都需要在真实 Firefox 里对真实视频页验证一次（本子任务无浏览器操作权限）。结构与格式已按参考项目源码对齐，但「已对齐」不等于「已实测」。
2. **AMO 上架物料未做**：商店描述文案、截图（至少 1 张 1280×800 级别）、分类选择未准备；图标目前只有 SVG（AMO 接受 SVG；若需 PNG 再导出 256px 版）。
3. **爱发电 Pro 商品未建**：购买链接仍是 `TODO_BUY_URL` 占位；建商品后替换 `src/lib/config.js` 一处常量即可。发码流程已就绪（隐藏生成器）。
4. **未建公开仓**：本目录尚未 git init / push 到 GitHub；manifest 的 homepage_url 已预填 `github.com/alapha888/subtitle-exporter`，建仓后生效。
5. 次要：Bilibili 番剧（bangumi/ep 页）未适配（v1 只覆盖普通视频页）；YouTube 播放页 SPA 切视频时轨道在 popup 打开时实时读取，无缓存失效问题，但未实测。
