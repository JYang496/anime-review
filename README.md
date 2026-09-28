# 番迹 · Anime Review

浏览近年动画，勾选看过的作品，生成可分享的 PNG 观看清单。

**[在线使用](https://jyang496.github.io/anime-review/)** · [GitHub 仓库](https://github.com/JYang496/anime-review)

## 使用方式

1. 使用顶部筛选栏选择年份、季度和类型，或搜索中文名、原名、别名。
2. 点击动画封面标记为看过，再次点击取消。可切换“只看已选”。
3. 在底部查看已选数量，点击“编辑清单”管理全部已选作品。
4. 填写可选的海报昵称，点击“生成我的动画清单”。
5. 在预览中下载 PNG；手机也可长按图片保存。

## 功能

- **固定操作栏**：标题和筛选栏固定在顶部；观看清单、昵称输入和生成按钮固定在底部，滚动时仍可操作。列表根据操作栏实际高度预留空间。
- **筛选与排序**：年份、季度、TV / WEB / 剧场版 / OVA 类型组合筛选；支持按人气、首播最新、首播最早、评分及名称排序。
- **清单编辑**：弹窗展示全部已选封面，支持逐个移除、一键清空和撤销最近一次清空；修改自动保存。
- **本地记录**：观看记录与昵称保存在当前浏览器，无需登录。
- **手机长图**：导出 1080px 宽的 PNG 长图，按首播年份分组，每行最多 4 部，片名放大以便手机阅读；所有已选作品合成一张图片，不分图、不截断；超大清单会等比例降低输出分辨率，以控制画布尺寸与内存占用。
- **缺图回退**：无法加载封面时显示作品名称，仍可生成清单。
- **响应式布局**：适配电脑和手机。

列表中的排序不影响海报：海报按首播年份与日期排列。首播年份不代表用户观看年份，“看过”由用户自行勾选，不自动判断是否看完。

## 数据与存储

| 内容 | 来源及保存位置 |
| --- | --- |
| 动画资料 | 同步脚本从 Bangumi API 获取，保存为 `dist/data/catalog.json` |
| 动画封面 | 同步时下载到 `dist/covers/`，网站从同源静态文件加载 |
| 观看记录、昵称 | 当前浏览器的 `localStorage`，不上传服务器 |
| 分享 PNG | 浏览器通过 Canvas 生成，由用户下载保存 |

用户访问网站时读取已同步的静态目录，**不会实时请求 Bangumi API**。当前仓库初始快照覆盖 2024—2026 年；具体范围与更新时间以目录数据和页面显示为准。

同步默认收录近三个自然年、截至同步当天已首播的 TV、WEB、剧场版和 OVA，排除数据源标记的 NSFW 条目。资料准确性取决于数据源。

记录不跨设备、浏览器或网站来源同步。清除网站数据后记录会丢失；隐私模式或浏览器限制可能导致无法保存。目录滚动更新后，已不在目录中的条目会在恢复选择时被忽略。

## 本地运行

需要 **Node.js 22 或更高版本**。项目无第三方运行依赖，无需执行 `npm install`。

```sh
 git clone https://github.com/JYang496/anime-review.git
 cd anime-review
 npm run dev
```

打开 [本地预览](http://127.0.0.1:4173/)。不要直接双击 HTML 文件：ES 模块和目录加载需要 HTTP 服务。开发服务器仅监听本机，修改后刷新页面即可。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地静态服务器 |
| `npm run sync` | 更新动画目录并缓存封面 |
| `npm test` | 运行数据逻辑测试 |
| `npm run check` | 检查主要前端脚本语法并运行测试 |

测试覆盖组合筛选、别名与全角搜索、损坏的本地记录恢复、单张海报完整收录，以及各类排序与原始数据保持不变。

## 更新动画目录

```sh
npm run sync
```

同步按季度分页获取、按作品 ID 去重，并复用已有封面缓存。API 请求失败会重试；完整目录获取后才原子替换 JSON，失败时保留旧目录。个别封面下载失败时使用文字回退，不阻止其他作品更新。

可通过 `START_YEAR` 环境变量指定起始年份，例如 PowerShell：

```powershell
$env:START_YEAR = '2023'
npm run sync
Remove-Item Env:START_YEAR
```

已缓存但不再属于当前目录的封面不会自动删除。

### 自动更新

`.github/workflows/refresh-catalog.yml` 提供每周一 **05:19 UTC** 的定时更新，也可在 Actions → **Refresh anime catalogue** 中手动运行。

工作流同步数据、运行检查并提交有变化的目录和封面。需要仓库启用 Actions，且允许工作流写入仓库；分支保护规则也可能限制自动提交。

## GitHub Pages 部署

网站使用 GitHub Pages，**发布根目录为 `dist`**，无需额外构建步骤。

1. 在仓库 **Settings → Pages → Build and deployment** 中将 Source 设为 **GitHub Actions**。
2. 将网站修改推送到 `main`，或在 Actions 中手动运行 **Deploy GitHub Pages**。
3. 等待部署成功，访问 [网站首页](https://jyang496.github.io/anime-review/)，无需 `/dist/` 后缀。

`.github/workflows/deploy-pages.yml` 在以下情况下发布最新 `main` 分支：

- 推送修改涉及 `dist/**` 或该部署工作流。
- 手动触发部署。
- **Refresh anime catalogue** 工作流成功结束。

目录更新工作流使用 `GITHUB_TOKEN` 提交，部署通过 `workflow_run` 接续触发。**仅修改 README 不会触发网站重新部署。**

如果首页显示 README，检查是否仍使用仓库根目录的 Jekyll 发布方式；应使用项目提供的工作流直接上传 `dist`。如果看到旧页面，可强制刷新并检查 Actions 部署状态。

`.openai/hosting.json` 是早期 Sites 注册留下的标识，当前 GitHub Pages 部署不依赖它。

## 项目结构

```text
.github/workflows/
  deploy-pages.yml       GitHub Pages 部署
  refresh-catalog.yml    定时同步动画目录
dist/
  index.html             页面、清单编辑与海报预览弹窗
  style.css              响应式布局及固定操作栏
  app.js                 交互、清单编辑与本地保存
  catalog.js             筛选、排序、分页和记录恢复
  poster.js              Canvas 海报生成
  data/catalog.json      动画目录快照
  covers/                封面缓存
scripts/
  serve.mjs              本地开发服务器
  sync-catalog.mjs       Bangumi 数据同步
test/
  catalog.test.mjs       数据逻辑测试
```

## 数据来源与图片版权

动画资料来自 [Bangumi API](https://github.com/bangumi/dev-docs)，名称、日期和评分以数据源为准。封面版权归原权利人所有。

界面使用 Noto Sans SC 在线字体，无法加载时回退到系统字体。网站本身不需要账户或数据库，也不提供观看记录的云端同步。
