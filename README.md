# GitHub 中文插件（github-zh-cn）

一个把 GitHub 界面变成中文的浏览器扩展，支持 Chrome 和 Edge。

## 功能

- **界面汉化**：内置 300+ 条 GitHub 常用词库，把按钮、菜单、导航、设置等界面文字即时替换为简体中文，只做精确匹配，不会误伤代码、链接和你自己写的内容。
- **整页翻译**：可选的“整页翻译”开关，调用 Google 翻译接口，把页面上的英文段落也翻译成中文。
- **动态页面支持**：GitHub 页面是动态加载的，插件会持续监听新出现的文字并自动汉化。
- **随时恢复**：一键恢复英文原文。

## 安装方法（开发者模式）

1. 下载本仓库代码（或发布页里的 `github-zh-cn-extension.zip`）并解压到任意文件夹。
2. 打开 Chrome 或 Edge，在地址栏输入 `chrome://extensions`（Edge 是 `edge://extensions`）。
3. 打开右上角的「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择解压出来的文件夹。
5. 打开 `https://github.com`，界面就变成中文了。点击浏览器工具栏里的插件图标可以开关「界面汉化」和「整页翻译」。

## 使用说明

- 默认只对 `https://github.com` 生效。想支持公司内部的 GitHub Enterprise（如 `github.你的公司.com`），在 `manifest.json` 的 `content_scripts.matches` 和 `host_permissions` 里加上对应网址后重新加载扩展即可。
- 「整页翻译」使用 Google 的免费翻译接口（`translate.googleapis.com`），无需 API Key，但请求量大时可能会被限流，遇到失败会自动跳过，稍后重试即可。

## 文件结构

```
github-zh-cn/
├── manifest.json          # 扩展配置（Manifest V3）
├── dictionary.js          # 中英文词库
├── content.js             # 页面翻译逻辑
├── popup.html / popup.js  # 工具栏弹窗
├── _locales/zh_CN/        # 扩展自身的中文描述
└── icons/                 # 图标
```

## 打包

浏览器打开 `chrome://extensions` → 开发者模式 → 「打包扩展程序」，选择项目文件夹即可生成 `.crx`。也可以把整个文件夹压缩成 zip 分享给别人（`manifest.json` 要在 zip 根目录）。

## 许可证

MIT
