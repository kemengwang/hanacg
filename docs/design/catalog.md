# Hana 自有作品库与同步

## 范围

PostgreSQL + Drizzle，继续使用 Fastify。Web 的番剧/小说/漫画目录与每日放送统一读取 Hana API；推荐页保留明确标识的 11 部精选快照。数据库未配置时目录返回 503，书籍不造数据，番剧可使用既有精选回退。数据库访问仅位于 `apps/server`，共享包不依赖数据库驱动。

本阶段提供作品/别名/标签/关系/外部映射/参考评分、标准动画分集、每周放送安排、来源目录持久化、任务调度与 CLI 导入。未实现小说正文、漫画图片阅读、人物角色百科、管理后台、完整归档导入或精确到分钟的播出时间表。书籍保留系列/单行本粒度，不自动合并。

## 启动

```sh
pnpm db:up
cp apps/server/.env.example apps/server/.env # 已有配置时不要覆盖
pnpm db:migrate
pnpm db:import 10380 18462 352517 # 可选，小批量指定公开条目
pnpm dev
```

`pnpm dev` 同时运行 Web、API 和独立 worker。`pnpm dev:app` 只启动 Web/API，用于不运行同步的开发与浏览器测试。`pnpm dev:worker` 单独运行 worker。生产构建后分别运行 server 的 `start` 和 `start:worker`，由部署系统管理生命周期。迁移单独执行，API 启动不等待网络同步。

本地 Compose 仅绑定 127.0.0.1:54329，示例密码仅用于本机开发。线上自行提供 PostgreSQL 凭据、持久化备份、TLS 与访问控制。不要把 `.env` 或凭据放入 VITE\_\*。

## 模型与兼容

- `subjects`：anime/novel/manga 三类，原文名/中文名、简介、类型、series、部分精度日期、封面、集数、infobox、发布状态。日期只保存已知精度。JSONB infobox 保留有序、多值资料；外部数据先校验。
- `subject_names` / `subject_tags`：别名搜索及公共/自由标签；保留来源维度。当前未把自由标签自动归为统一题材词表。
- `subject_external_refs`：外部 ID、原始响应、摘要、检查时间、出处及许可。`subject_external_ratings` 保存外部评分、人数与排名；无评分存 NULL，兼容现有卡片契约时转 0 表示暂无评分。
- `subject_relations`：保留关系类型及目标外部 ID，即使目标未入库也不丢失，后续可通过映射连接。不会按标题自动合并作品。
- `episodes`：正片、特别篇等分开；序号允许小数。已录入章节数不代表已播出或已可播放。
- `release_schedules`：独立每周安排，当前接口只有星期，不虚构时区或钟点；超过两天未刷新不继续作为当前放送表展示。
- `source_entries` / `source_lines` / `source_episodes`：实际来源、线路和分集目录；没有可靠映射时标准分集 ID 为空。当前记录收录状态，不声明已经验证播放成功。媒体 URL 继续按需解析。
- `subject_update_state`：来源目录汇总，可从明细重建；跨线路不相加。附检查时间，不能当作实时保证。
- `sync_jobs` / `sync_runs`：持久化任务、租约和执行结果；运行日志保留 30 天。

自有 ID 使用从 1,000,000,000 开始的 PostgreSQL identity，旧 ID 区间保留兼容。旧 `/api/anime/:id` 经外部映射读取数据库；未入库精选仍可读取快照。客户端启动时批量解析旧收藏/历史 ID，备份原存储再迁移；网络失败保留原数据，稍后重试。API 不返回上游原始资料、凭据、内部来源映射和任务错误。

## API

- `GET /api/catalog/subjects?kind=anime|novel|manga&q=&limit=24&offset=0`，支持 year/tag/minScore/series；limit 最大 100，稳定按参考排名与 ID 排序。前端沿用最多 24 条的本地组合筛选。
- `GET /api/catalog/calendar`：按记录返回 weekday，最多 500 条，不从日期推造新集。
- `GET /api/anime/:id`：兼容旧 ID 的动画资料。
- `GET /api/catalog/subjects/:id/episodes`：标准分集及来源收录摘要，不包含上游分集 ID。
- `POST /api/catalog/resolve-ids`：最多 200 个旧 ID 的兼容映射。
- 既有 `/api/playback/episodes` 可携带 animeId；用户选中的有效来源目录入库并加入后续同步。

## 同步与写入保护

首次 worker 启动入队放送表和三类目录发现任务。最新目录以每页 24 条轮转前 10 页，每 6 小时一页；高分首页每周刷新。它是有界发现，不等于全量镜像。手动导入 CLI 支持多个外部条目 ID，串行限速并加入维护任务。

连载/近期放送作品约每 4 小时更新资料，其他条目约每周；放送表每 6 小时刷新。已选择播放来源的目录，近期放送作品每 2 小时、其他作品每天刷新。由于尚无可信精确开播时刻，当前不实现 10 分钟更新窗口。不会后台自动播放或下载视频。

元数据客户端每个请求至少间隔 1 秒，默认 1.5 秒，20 秒超时，明确 User-Agent，可选服务端 token。429/401/403 触发至少一小时的元数据全局延后，并尊重更长的 Retry-After；其他失败指数退避。重启读取 next_run_at，不重新全库扫描。worker 通过 PostgreSQL advisory lock 保证单一上游调度者，每个任务另有可恢复租约及所有权令牌。

条目写入事务通过外部 ID 加锁、唯一约束实现幂等。数据摘要相同时不改作品修改时间。`locked_fields` 使用数据库字段名（如 `name_cn`、`summary`、`infobox`）保护人工改动；该机制只保护主表字段，派生别名/标签仍由导入器维护。不存在公开写接口，人工操作当前通过受信任数据库管理进行。导入条目、章节与关系先完成校验，失败整体回滚。一次网络错误或空来源目录不删除已有资料。上游缺失章节暂保留，避免误删；删除审核流程后续补充。

## 数据使用与访问验证

匿名公开作品详情、分集、放送表以及小说/漫画目录已经实测可读，无需用户账号。并不保证每个条目都公开，也不保证未来不变；鉴权失败会记录并退避，不自动要求用户提供密码。确有需要时仅在服务端配置个人 access token。

官方允许通过 API/归档开发应用；条目内容遵循其版权声明中的 CC BY-SA，已有版权的封面需分别看待。业务页面使用中性评分文案，通过“资料说明”链接说明资料与参考评分出处，不声称为本站用户评分。不能承诺完全隐藏来源，也不能把 API 可访问视作不受条件限制的复制许可。未导入用户收藏、评论、日志等个人数据。

- https://bangumi.tv/about/copyright
- https://github.com/bangumi/api/blob/master/docs-raw/user%20agent.md
- https://github.com/bangumi/Archive （官方周期归档，未来全库初始化应评估此路径，避免全站逐条请求）

## 验证

`pnpm check` 覆盖类型、单测与构建；`pnpm test:db` 在独立临时数据库测试迁移、并发幂等、人工字段锁、失败回滚、搜索、来源摘要、租约恢复、API，再清理自己创建的数据库，需要本地用户有 CREATEDB 权限。`pnpm test:e2e` 使用受控 Hana API 和测试视频，不运行 worker。真实资料连通性使用 `pnpm db:import`，与真实视频站可播放性分开报告。

## 番剧地区筛选

`subjects.regions` 保存地区分组数组（japan/china/western/korea/other），允许合拍；空数组表示未标注。导入只使用明确公共地区标签或资料框的国家/地区字段，不根据标题语言或自由用户标签猜测。`pnpm db:migrate` 同时从已有原始资料回填地区，不额外请求上游，并保留 `locked_fields` 中的 regions 人工锁定。

番剧目录新增地区行（日漫、国漫、欧美、韩漫、其他、未标注）。`GET /api/catalog/subjects` 的 `region` 在数据库分页前筛选，关键词搜索也携带地区；风格、年份等原有筛选仍针对当前已加载条目。离线时仅筛选本地精选，未标注不会混入“其他”。
