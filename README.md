# 番迹 · Anime Review

一个中文动画观看清单工具：浏览近三年动画，勾选看过的作品，生成可分享的 PNG 封面墙。

## 本地启动

需要 Node.js 22 或更高版本。无第三方运行依赖，无需安装包。

```sh
npm run dev
```

打开 http://127.0.0.1:4173 。不要直接双击 HTML：目录数据和 ES 模块需要 HTTP 服务。

## 功能

- 年份、季度、作品类型组合筛选，中文名、原名与别名搜索。
- 封面点击选择、取消、只看已选、分批加载。
- 观看记录和昵称只存储在当前浏览器的 localStorage，不上传到服务器。
- Canvas 生成紧凑 PNG；按首播年份分组，最多 6 列，少量作品自动缩窄画布，每张最多 40 部，长清单自动拆分。
- 支持手机长按保存与桌面下载。封面不可用时采用文字卡片。
- 2024—2026 年真实 Bangumi 数据快照，收录截至同步当天已首播的 TV、WEB、剧场版、OVA；排除数据源标记的 NSFW 条目。

注意：首播年份不是用户观看年份。“看过”由用户自行勾选，本站不判断是否看完。

## 更新目录

```sh
npm run sync
```

按当前年份滚动获取近三个自然年的目录，按季度分页，去重并下载同源封面。API 请求失败会重试；目录完整获取后原子替换，失败不覆盖旧目录。图片单独失败时保留文字回退。可用 START_YEAR 环境变量指定起始年份。

`dist/data/catalog.json` 保存作品元数据和原始封面来源，`dist/covers/` 保存本地缓存。同步会复用已有封面，已缓存但不再属于目录的图片不会自动删除。年际滚动后已不在目录中的选择会被忽略。

`.github/workflows/refresh-catalog.yml` 提供每周自动更新与手动触发。只有代码推送到 GitHub 默认分支、Actions 启用且具有写入权限时才会运行。目录更新成功后，Pages 部署工作流会自动发布最新的 `main` 分支。

## 验证

```sh
npm run check
```

测试覆盖组合筛选、别名/全角搜索、损坏的本地存储、海报分页去重。

## 项目结构

- `dist/index.html`：页面和预览弹窗
- `dist/style.css`：桌面与移动端样式
- `dist/app.js`：页面交互、本地保存
- `dist/catalog.js`：纯数据逻辑
- `dist/poster.js`：Canvas 海报生成
- `scripts/sync-catalog.mjs`：Bangumi 数据同步
- `scripts/serve.mjs`：仅用于开发的静态服务器

## GitHub Pages 部署

发布目录为 `dist`，无需构建步骤。`.github/workflows/deploy-pages.yml` 只上传该目录，使 `index.html` 成为网站首页，而不是展示仓库的 README。

1. 在仓库 Settings → Pages → Build and deployment 中将 Source 设为 **GitHub Actions**。
2. 推送代码到 `main`，或在 Actions 中手动运行 **Deploy GitHub Pages**。
3. 工作流成功后访问 https://jyang496.github.io/anime-review/ ，无需 `/dist/` 后缀。

网站文件更新、手动触发，以及动画目录同步成功后都会部署。目录同步使用 `GITHUB_TOKEN` 提交不会触发普通 push 工作流，因此通过 `workflow_run` 接续部署。

`.openai/hosting.json` 是之前注册 Sites 时保留的标识，GitHub Pages 部署不依赖它。

## 数据来源

数据来自 [Bangumi API](https://github.com/bangumi/dev-docs)。名称、首播日期、评分等以数据源为准。动画封面版权归原权利人所有，本站标注来源，不主张图片所有权。界面使用 Noto Sans SC 在线字体，无法加载时回退系统字体。
