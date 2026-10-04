# AMO Listing 文案（提交前备稿，2026-10-04）

## 名称 / Name
- EN: Bilingual Subtitle Exporter for YouTube & Bilibili
- ZH: 双语字幕导出助手（YouTube＋Bilibili）

## 摘要 / Summary（≤250 字符）
- EN: Export subtitles from YouTube and Bilibili in one click. Free: TXT export. Pro (one-time license): SRT/VTT/ASS, bilingual side-by-side export, and batch export of all tracks. No ads, no tracking.
- ZH: 一键导出 YouTube 与 Bilibili 字幕。免费导出 TXT；Pro 激活码（一次买断）解锁 SRT/VTT/ASS、双语对照与全轨道批量导出。无广告、无追踪。

## 描述 / Description
- EN:
Watching is easy; keeping the words is not. This add-on reads the subtitle tracks a video page already provides and saves them as clean text files.

Free:
- One-click TXT export for YouTube and Bilibili videos
- Automatic merging of rolling ASR captions

Pro (one-time license key, no subscription):
- SRT / VTT / ASS export
- Bilingual export: two languages aligned by timestamp, line by line
- Batch export of every available track

Privacy: the add-on processes subtitles locally in your browser. It declares no data collection (data_collection_permissions: none). It only accesses subtitle data on youtube.com and bilibili.com pages you open.

Notes: only videos that already have subtitle tracks can be exported. Bilibili fan-drama (bangumi) pages are not supported in v1.

- ZH:
看视频容易，把字幕留下来难。这个插件读取视频页面已有的字幕轨道，保存为干净的文本文件。

免费功能：
- YouTube 与 Bilibili 视频字幕一键导出 TXT
- 自动合并滚动式 ASR 字幕的重复行

Pro 功能（激活码一次买断，无订阅）：
- SRT / VTT / ASS 导出
- 双语对照导出：两种语言按时间轴逐行对齐
- 全部字幕轨道批量导出

隐私：所有处理都在本地浏览器完成，插件声明不收集任何数据（data_collection_permissions: none），仅在你打开的 youtube.com 与 bilibili.com 页面读取字幕数据。

说明：只有本身带字幕轨道的视频可导出；v1 暂不支持 Bilibili 番剧页。

## 分类建议
- Primary: Other / 其他；备选：Photos, Music & Videos 邻近分类以 AMO 实际选项为准。

## 提交清单（Submit 时逐项对）
- [ ] AMO 开发者账号（邮箱注册＋确认；如强制 2FA 用 TOTP 自理）
- [ ] 上传 web-ext build 产物 zip（24KB，原生 JS 无构建，免源码提交说明）
- [ ] 图标 SVG 已备；截图 2–3 张待补（popup、设置页、导出示例）
- [ ] 爱发电 Pro 商品建好后，把购买链接填入插件 TODO_BUY_URL 并重打包，再提交含购买入口的版本；或先提交无购买入口版、Pro 仅靠 README 引流——提交当天二选一并记录
