# SDPlugins — 自研示例插件

本目录存放基于官方模板实现的完整插件示例，方便在参考 `SDNodeJsSDKV2` 等 SDK 的同时查看真实业务插件。

## 当前示例

### [com.dawn80s.streamdock.memoryusage.sdPlugin](./com.dawn80s.streamdock.memoryusage.sdPlugin)

macOS **内存使用率（修正版）** 插件：

- 基于 [SDNodeJsSDKV2](../SDNodeJsSDKV2/com.mirabox.streamdock.demo.sdPlugin)（内置 Node 20）
- 公式：`(active + wired + compressor) / physical_pages`，修复官方性能监视器长期约 100% 的问题
- 圆形进度环 UI、阈值颜色、可自定义图内标题/字号

#### 安装

```bash
# 必须先完全退出 StreamDock
cd SDPlugins/com.dawn80s.streamdock.memoryusage.sdPlugin/plugin
npm install
npm run build   # ncc 打包并安装到 ~/Library/Application Support/HotSpot/StreamDock/plugins/
open -a StreamDock
```

若 StreamDock 已卡住无法打开：

```bash
killall -9 StreamDock
```

#### 开发参考路径

| 需求 | 参考 |
|------|------|
| Node 插件脚手架 / WebSocket | `SDNodeJsSDKV2/` |
| 本示例业务逻辑 | `SDPlugins/.../plugin/{memory,gauge,index}.js` |
| 属性检查器 | `SDPlugins/.../propertyInspector/` |
| 官方文档 | https://sdk.key123.vip |
