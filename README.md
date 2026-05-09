# 一键清空网站缓存

浏览器扩展工具，用于一键清理当前网站的全部缓存数据

## 功能介绍

- 清理当前网站及子域名下所有Cookie
- 清除LocalStorage、SessionStorage、IndexedDB数据
- 清理Cache API、Service Worker、HTTP缓存
- 清理WebSQL、文件系统数据、应用缓存
- 清理完成后自动强制刷新页面
- 支持二次确认，防止误操作

## 使用方式

1. 在需要清理缓存的网页打开扩展
2. 点击「清空缓存」按钮
3. 确认清理范围后执行清空
4. 等待清理完成，页面自动刷新

## 快速开始

首先启动开发服务：

```bash
pnpm dev
# 或者
npm run dev
```

## 协议

Apache License 2.0