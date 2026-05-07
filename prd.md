# AI Product Competitive Intelligence Layer — PRD

> Transform any URL about an AI product into an actionable competitive intelligence snapshot.

---

## 1. Concept & Vision

**Not "an AI product research tool."**

We're building a **competitive intelligence layer for the AI era** — a tool that takes a URL (any link about an AI product) and delivers in minutes what currently takes 3-5 hours of manual crawling + synthesis.

The insight: Our target users aren't lazy — they're rational. The cost-benefit of manual research doesn't pencil out. Most entrepreneurs just skip it and bet the company. That's the real problem. We're competing with "nothing" — the decision to start building without research because research feels too expensive.

**The 10-star version feels like a conversation with someone who has obsessively tracked 10,000 AI products for 10 years and can instantly tell you:**
- "This product is accelerating — they just hired 3 ML engineers, their retention jumped 40%, and they're 2 features away from your core differentiation."
- "You're not too early. The last 3 products in your space all found their first 1,000 users within 6 weeks of launch. You're on week 4."
- "Stop watching them. This competitor is dying — they're losing power users at 15%/month and their last 3 hires are all on support."

---

## 2. Problem Statement

### Current State

1. **创业者 (founder)** 看到竞品信息，只能浅层知道有这么个产品
2. 想做深入分析需要手动去查询动态、社交媒体数据、用户反馈
3. 还要检查市场有没有类似竞品、创始人背景
4. 整个流程做完还要整理写入笔记
5. **3-5小时/次** 的手动工作，太麻烦，团队成员直接跳过

### The Cost of Skipping

When teams skip research, they spend 6 months building what competitors already have — and have iterated for several rounds. The product launches into an occupied market with no differentiation.

### Target Users

| 用户 | 痛点 | 当前Workaround |
|------|------|---------------|
| **创业者** (Memory Science — AI视频分镜) | 纠结要不要做某个功能，或如何比竞品做得更好 | 写脚本爬社交媒体数据，3-5小时/次 |
| **投资人** | 快速寻找潜在可投资的产品，分析市场/竞争/上下游 | 手动做竞品调研 |
| **独立开发者** | 快速确认竞争情况，找差异化空间 | 跳过，直接开始做 |

---

## 3. User Stories

### Primary User Stories (80% of usage)

#### US-01: 创业者分析竞品
```
As a 创业者
I want to 粘贴一个竞品URL (小红书/公众号/新闻链接)
To get 结构化的竞品快照（定位/定价/功能/目标用户）
So that 我可以做出差异化决策，而不是花3-5小时手动爬数据
```

**Example:** 粘贴Cursor URL → "Cursor: AI-first IDE targeting pro developers. $10-20/mo. Key diff: VS Code extension. Target: Individual devs & small teams. We beat them on enterprise security."

#### US-02: 投资人评估标的
```
As a 投资人
I want to 输入公司URL + Product Hunt链接
To get 竞品定位快照，对比2-3个直接竞品
So that 我可以评估投资标的的竞争差异化
```

**Example:** "Company X positions as 'more affordable than Anthropic, faster than OpenAI.' Direct competitors: Anthropic, OpenAI. Pricing 70% below Anthropic. Target: SMB only."

#### US-03: CI团队监控竞品动态
```
As a CI负责人
I want to 输入竞品博客/新闻URL
To get 关键发布/功能更新/合作的预警摘要
So that 我可以在24小时内知会领导层竞品变化
```

**Example:** "3 new announcements: Claude Enterprise, Amazon partnership, 100k context window. Indicates enterprise push."

#### US-04: 批量竞品调研
```
As a 顾问/研究员
I want to 输入10-15个URL（各渠道来源）
To get 合并的竞品报告（含主题/差距/建议）
So that 我可以在2小时交付客户报告，而不是2天
```

### Secondary User Stories

#### US-05: 创始人验证想法
```
As a 创始人
I want to 输入一个做类似产品的公司URL
To see 是否有白空间值得进入
So that 我可以找到差异化方向
```

#### US-06: 市场负责人优化话术
```
As a 市场VP
I want to 了解竞品在特定关键词上的定位
To refine 我们的SEO和品牌话术
So that 我们可以在差异化关键词上领先
```

#### US-07: 高管委托研究
```
As a CEO
I want to 让产品团队产出竞品报告
To focus 我自己的时间在战略上
So that 我看结论，团队做脏活
```

#### US-08: 记者快速背景调查
```
As a 科技记者
I want to 快速了解产品背景
To write 准确报道
So that 我不用花时间搜索
```

### Edge User Stories

#### US-09: 追踪定位变化
```
As a PM
I want to 看竞品定位在6个月内的演变
To detect 潜在的pivot
```

#### US-10: 采购决策
```
As a 企业采购
I want to 从多源获取客观优缺点
To justify 采购决策
```

#### US-11: 猎头评估公司
```
As a 猎头
I want to 评估公司市场地位
To advise 候选人风险
```

---

## 4. Functional Requirements

### MUST HAVE (MVP)

| ID | Feature | Description | Rationale |
|----|---------|-------------|-----------|
| M1 | **任意URL输入** | 支持任何公开URL（首页/文章/小红书/公众号/新闻等） | 核心输入，多渠道兼容 |
| M2 | **产品名提取** | 从URL中识别产品名称 | 基础识别 |
| M3 | **Slogan/价值主张** | 提取 tagline 和核心价值主张 | 定位核心 |
| M4 | **功能列表** | 识别并列出主要功能/能力 | 竞品对比基础 |
| M5 | **定价提取** | 检测定价（显式或"联系获取报价"） | 关键决策数据 |
| M6 | **目标用户** | 识别目标群体（企业/SMB/开发者/消费者） | 定位核心 |
| M7 | **创立时间** | 提取 founding year 或 launch date | 时机判断 |
| M8 | **团队规模** | 识别 team size (if available) | 健康度信号 |
| M9 | **来源平台检测** | 检测来源（小红书/公众号/Twitter/新闻/web） | 语境理解 |
| M10 | **结构化输出 (JSON)** | 机器可读的 JSON 格式 | Agent集成 |
| M11 | **结构化输出 (Markdown)** | 人可读的 Markdown 格式 | 人类可读 |
| M12 | **中英双语** | 支持中英文内容 | 核心市场 |
| M13 | **响应 SLA** | 标准页面30秒内完成 | 体验核心 |

### SHOULD HAVE (1.0)

| ID | Feature | Description | Priority |
|----|---------|-------------|---------|
| S1 | **多源合成** | 输入3-5个URL，合并成单一分析 | High |
| S2 | **竞品识别** | 自动发现文中提到的2-5个竞品 | High |
| S3 | **情感提取** | 用户评论/评论中的情感（正/负/中） | High |
| S4 | **动态检测** | 发现最近更新/功能/路线图暗示 | Medium |
| S5 | **导出 PDF** | 导出为 PDF 格式 | Medium |
| S6 | **导出 Markdown** | Notion 兼容格式 | Medium |
| S7 | **来源追溯** | 每个洞察链接回源URL | High |
| S8 | **分类** | 自动归类到垂直领域（编码助手/图像生成/聊天机器人） | Medium |
| S9 | **历史追踪** | 存储历史分析，展示定位变化 | Medium |
| S10 | **结果缓存** | 相同URL返回缓存（含时间戳） | Medium |

### COULD HAVE (Future)

| ID | Feature | Description |
|----|---------|-------------|
| C1 | **对比模式** | 2+产品横向对比矩阵 |
| C2 | **预警系统** | 监控URL更新，有变化时通知 |
| C3 | **语音输入** | 语音描述产品，生成分析 |
| C4 | **API访问** | 企业集成的程序化API |
| C5 | **团队协作** | 共享工作区、评论、Slack集成 |
| C6 | **演示模式** | 生成用于汇报的幻灯片 |
| C7 | **垂直领域深度** | 金融/医疗/教育垂直深度分析 |
| C8 | **多语言扩展** | 支持10+语言 |

### WON'T HAVE (明确不做)

| ID | Feature | Rationale |
|----|---------|------------|
| W1 | **实时监控** | 需要Webhook+持续基础设施，太复杂 |
| W2 | **内网支持** | 安全/合规负担，只做公开URL |
| W3 | **自动竞品发现** | 需要大量爬虫基础设施，手动输入 |
| W4 | **市场规模** | 需要外部数据，超出范围 |

---

## 5. Edge Cases

### Critical Edge Cases (Must handle gracefully)

| ID | Edge Case | Handling |
|----|-----------|----------|
| E1 | **登录限制内容** | "此页面需要登录。请尝试公开的首页或博客链接" |
| E2 | **非产品URL** | "这似乎是新闻/分析，不是产品页。请使用产品首页" |
| E3 | **链接无法访问 (404/timeout/DNS)** | "无法访问此链接，请验证链接是否正确" |
| E4 | **JS重度渲染页面** | 提取困难时标注，建议备用来源 |
| E5 | **无内容的新产品** | "数据不足，此产品可能预发布或低调" |
| E6 | **重复URL** | 返回缓存结果（显示"上次分析于XX时间"） |
| E7 | **超大大页面 (>50k words)** | 处理前30k tokens，标注"部分内容未分析" |

### Moderate Edge Cases (Handle well)

| ID | Edge Case | Handling |
|----|-----------|----------|
| E8 | **混合语言页面** | 检测主内容语言，标注非主要语言部分 |
| E9 | **重定向链** | 跟随重定向至最终URL，输出中显示原始URL |
| E10 | **CAPTCHA** | 显示部分分析，提示"建议备用来源" |
| E11 | **PDF-only页面** | 标注PDF分析有限，建议HTML首页 |
| E12 | **社交媒体短链接** | 解析至最终URL，然后处理 |
| E13 | **加载超慢页面** | 30秒超时，返回部分结果并警告 |

---

## 6. Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| 单URL响应时间 (P95) | < 30s | 标准页面 |
| 单URL响应时间 (P99) | < 60s | 复杂页面 |
| 多源合成 (5 URLs) | < 90s | 批量分析 |
| 吞吐量 | 100 requests/min | 并发支持 |

### Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| 字段提取准确率 | > 85% | 抽检验证 |
| 产品识别准确率 | > 90% | 抽检验证 |
| 功能列表完整率 | > 80% | 抽检验证 |
| 情感判断准确率 | > 75% | 抽检验证 |

### Coverage

| Metric | Target | Measurement |
|--------|--------|-------------|
| 支持平台 | 小红书/公众号/Twitter/News/Web | 覆盖率 |
| 支持语言 | EN + CN | 覆盖率 |
| URL可访问率 | > 95% | 成功提取 |
| 有效分析率 | > 85% | 有实质内容输出 |

### Scale

| Metric | Target | Measurement |
|--------|--------|-------------|
| 并发用户 | 50 | v1 |
| 日分析量 | 1,000 | v1 |
| 数据存储 | 100 MB | 产品快照存储 |
| API可用性 | 99.5% | SLO |

---

## 7. MVP Definition

### Core Promise
**Paste a product URL → Get a one-page competitive snapshot in < 30 seconds.**

One input, one output. No login, no setup.

### MVP Features (Exact Scope)

1. ✅ 任意公开URL输入
2. ✅ 产品名 + Slogan 提取
3. ✅ 目标用户 + 定价
4. ✅ 功能列表
5. ✅ 来源平台检测
6. ✅ JSON + Markdown 双输出
7. ✅ 中英双语支持
8. ✅ 边界情况优雅处理

### Out of MVP

- ❌ 多源合成
- ❌ 竞品自动识别
- ❌ 情感提取
- ❌ 历史追踪
- ❌ 导出功能
- ❌ 预警系统
- ❌ Agent Skill (v1之后)

### MVP Success Criteria

| Metric | Target |
|--------|--------|
| 单URL分析完���率 | > 95% |
| 响应时间 < 30s | > 90% |
| 字段提取准确率 | > 85% |
| NPS (初始用户) | > 40 |

---

## 8. Output Format Specification

### JSON Schema

```json
{
  "version": "1.0",
  "analyzedAt": "2026-04-22T10:00:00Z",
  "source": {
    "url": "https://cursor.sh",
    "platform": "web",
    "originalUrl": "https://cursor.sh"
  },
  "product": {
    "name": "Cursor",
    "tagline": "The AI-first code editor",
    "founded": "2023",
    "teamSize": null,
    "url": "https://cursor.sh"
  },
  "analysis": {
    "targetUsers": ["developers", "indie hackers"],
    "category": ["AI IDE", "Code Editor"],
    "pricing": {
      "model": "subscription",
      "tiers": [
        { "name": "Free", "price": 0 },
        { "name": "Pro", "price": 20, "period": "month" }
      ]
    },
    "features": [
      "AI-native editing",
      "Powered by Claude/GPT-4",
      "Codebase-aware autocomplete",
      "Inline documentation generation"
    ],
    "competitors": [
      { "name": "GitHub Copilot", "confidence": "high" },
      { "name": "Windsurf", "confidence": "medium" }
    ],
    "sentiment": {
      "positive": ["fast", "intuitive", "AI-first"],
      "negative": ["pricey", "limited offline"],
      "score": 0.72
    }
  },
  "meta": {
    "sourcesAnalyzed": 1,
    "processingTime": 12,
    "language": "en",
    "confidence": 0.85
  }
}
```

### Markdown Template

```markdown
# [Product Name]

**Tagline:** [One-line description]

---

## Overview
- **Founded:** [Year]
- **Target Users:** [Segment 1], [Segment 2]
- **Category:** [Category 1], [Category 2]
- **Website:** [URL]

---

## Pricing
| Tier | Price |
|------|-------|
| [Free/Pro/Enterprise] | $[Price]/[period] |

---

## Key Features
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]
4. [Feature 4]

---

## Competitive Position

**Direct Competitors:** [Name 1], [Name 2]

**Differentiation:**
- ✅ [Their strength] → [Your window]
- ✅ [Their weakness] → [Your opportunity]

---

## User Sentiment

**Positive:** "[Quote]", "[Quote]"

**Negative:** "[Quote]"

---

## Momentum
[Rising / Stable / Declining]

---

*Analyzed from [Platform] · [X] sources · [Processing time]s*
```

---

## 9. Success Metrics

### North Star Metric

| Metric | Definition | Target | Note |
|--------|-----------|--------|------|
| **Analysis Completed** | 成功完成分析的URL数量 | 持续增长 | 核心价值交付 |

### Engagement Metrics

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| 日活跃用户 (DAU) | 每天至少做1次分析的用户 | v1: 50 | 初始验证 |
| 周活跃用户 (WAU) | 每周至少做1次分析的用户 | v1: 200 | 留存验证 |
| 平均分析次数/用户/周 | 每用户每周分析次数 | > 3 | 价值感知 |
| 多源使用率 | 使用多URL合成的比例 | > 20% | 高级功能采用 |

### Quality Metrics

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| 完成率 | 成功分析 / 总请求 | > 95% | 技术健康 |
| 重试率 | 需要重试的请求比例 | < 5% | 技术健康 |
| NPS | Net Promoter Score | > 40 (v1) | 用户满意度 |
| 错误率 | 返回错误的比例 | < 1% | 技术健康 |

### Retention Metrics

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| Week 1 Retention | 第1周回访用户 | > 50% | 初始留存 |
| Week 4 Retention | 第4周回访用户 | > 25% | 长期留存 |
| 30-day Retention | 月度留存用户 | > 15% | 健康度 |

### Growth Metrics

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| 周环比增长 | WAU周增长 | > 10% | 增长验证 |
| 口碑推荐率 | 通过推荐来的用户 | > 20% | 自然增长 |

---

## 10. Roadmap

### Phase 1: MVP (Weeks 1-4)
- [ ] 任意URL输入 + 解析
- [ ] 核心字段提取 (产品名/Slogan/功能/定价/目标用户)
- [ ] JSON + Markdown 双输出
- [ ] 中英双语支持
- [ ] 边界情况处理
- [ ] 基础缓存

### Phase 2: Enhancement (Weeks 5-8)
- [ ] 多源合成
- [ ] 竞品自动识别
- [ ] 情感提取
- [ ] 导出功能 (PDF/Markdown)
- [ ] 来源追溯

### Phase 3: Intelligence (Weeks 9-12)
- [ ] 历史追踪
- [ ] 定位变化检测
- [ ] 分类系统
- [ ] 预警系统 (daily digest)

### Phase 4: Agent Native (Weeks 13-16)
- [ ] MCP Skill 接口
- [ ] OpenClaw 集成
- [ ] 异步研究模式
- [ ] 主动提醒

---

## 12. Engineering Architecture

### 12.1 Data Flow

```
URL Input
   │
   ▼
┌──────────────────────┐
│   URL Validator      │ ─── validate format, detect blocked domains
└──────────────────────┘
   │
   ▼
┌──────────────────────┐
│   Router             │ ─── route: internal page / external API / error
└──────────────────────┘
   │
   ▼
┌──────────────────────┐
│   Fetcher           │ ─── HTTP GET with retries, headers, cookies
└──────────────────────┘
   │
   ▼
┌──────────────────────┐
│   Extractor          │ ─── parse HTML/JSON, extract fields by selector
└──────────────────────┘
   │
   ▼
┌──────────────────────┐
│   LLM Synthesizer    │ ─── structure into schema, EN+CN output
└──────────────────────┘
   │
   ▼
┌──────────────────────┐
│   Output Formatter    │ ─── JSON + Markdown rendering
└──────────────────────┘
   │
   ▼
Structured Snapshot Output
```

### 12.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                          │
│  GET /analyze?url=...&lang=en&fallback=...           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Business Logic Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Analyzer   │  │   Router   │  │ Formatter   │       │
│  │  Service    │  │  Service   │  │  Service   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Product    │  │  Snapshot  │  │   Alert     │       │
│  │   Model    │  │   Model    │  │   Model    │       │
│  └──────────��──┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ HTTP     │  │   LLM    │  │   Store  │                   │
│  │ Client   │  │  Client  │  │ (SQLite) │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 12.3 Core Data Models

```typescript
// product.ts
export interface Product {
  id: string;
  url: string;
  name: string;
  domain: string;
  category: string;
  detectedAt: Date;
  metadata: Record<string, unknown>;
}

// snapshot.ts
export interface Snapshot {
  id: string;
  productId: string;
  sourceUrl: string;
  createdAt: Date;
  summary: {
    what: string;
    who: string;
    why: string;
    momentum: 'rising' | 'stable' | 'declining';
  };
  features: string[];
  pricing: PricingTier[];
  targetUsers: string[];
  competitors: CompetitorRef[];
  userFeedback: {
    positive: string[];
    negative: string[];
    score: number;
  };
  rawContent?: string;
  fetchError?: string;
  llmWarning?: string;
}

// alert.ts
export interface Alert {
  id: string;
  productId: string;
  type: 'new_competitor' | 'trajectory_shift' | 'sentiment_change';
  severity: 'info' | 'watch' | 'action';
  body: string;
  createdAt: Date;
  delivered: boolean;
}
```

---

## 13. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Runtime** | Bun | Fast, good HTTP, deploys anywhere |
| **Crawler** | Playwright + Puppeteer | Headless, handles JS-heavy sites |
| **LLM** | Claude API (Haiku speed, Sonnet quality) | Best synthesis quality |
| **Store** | SQLite (local) or Supabase (cloud) | Simple, portable |
| **Queue** | Inngest or BullMQ | Background jobs, retries, alerting |
| **Deploy** | Railway / Fly.io / VPS | Simple, cheap start |
| **Agent Skill** | MCP server | Agent-native interface |

---

## 14. 3 Key Technical Decisions

### 14.1 Crawler vs API

| Option A | Option B | Recommended |
|---------|----------|------------|
| Headless browser (Playwright) — renders JS, sees stealth products, 5-10s/URL | Platform APIs (Clearbit, SimilarWeb, G2) — fast, structured, $50-500/mo | **A** — stealth products hide from scrapers. Browser renders actual page. ~$0 cost. |

### 14.2 LLM Synthesis

| Option A | Option B | Recommended |
|---------|----------|------------|
| Single prompt with schema — one call, ~$0.50/URL | Multi-stage pipeline — extract → validate → enrich, 3x calls | **B with fallback** — stage 1 raw → stage 2 structure. If stage 2 fails, return raw + error flag. |

### 14.3 Alert Delivery

| Option A | Option B | Recommended |
|---------|----------|------------|
| Email (SendGrid/Postmark) — reliable, tracked, $1/1000 | Webhook (POST to user URL) — real-time, no polling | **Webhook primary + Email fallback** — no email deliverability headaches |

---

## 15. Failure Modes & Handling

| Codepath | Failure | Handling |
|----------|---------|----------|
| URL fetch | domain blocks (403) | Return partial with `fetch_error: "blocked"`, NOT empty |
| URL fetch | rate limit (429) | Retry with exponential backoff (1s→2s→4s), max 3 retries |
| URL fetch | timeout (30s) | Return partial with `fetch_error: "timeout"` |
| LLM synthesis | malformed JSON | Fall back to raw markdown, set `llm_warning: "parse_failed"` |
| LLM synthesis | empty response | Retry once, then return empty + error |
| Stealth product | no data | Return `insufficient_data: true`, suggest manual review |

---

## 16. Test Strategy

### Happy Path
- Input valid URL → returns complete snapshot with all fields

### Failure Cases
- 403 blocked → returns partial with `fetch_error`
- Timeout → returns partial with warning
- Malformed JSON → returns raw markdown fallback

### Edge Cases
- Redirect chain → follows to final URL
- Cached repeat URL → returns cached with timestamp
- Large page (>50k) → processes first 30k tokens

---

## 17. Parallel Worktree

| Lane | Modules | Depends |
|------|---------|---------|
| **A: Crawler** | `src/fetcher/`, `src/parser/`, `src/router/` | — (core) |
| **B: LLM** | `src/llm/`, `src/formatter/` | A (needs raw HTML) |
| **C: Data** | `src/models/`, `src/store/` | A+B (needs both) |

### Launch Strategy
- **Lane A + B** 并行启动
- **Lane C** 依赖 A+B 完成后
- **NOT in MVP**: Dashboard, auth, historical tracking, scheduled polling

---

## 18. NOT in MVP Scope

- ❌ 用户认证/授权 (假设内部工具)
- ❌ 历史追踪 (v1只输出新快照)
- ❌ 自定义字段 (v1固定schema)
- ❌ 定时轮询 (v1手动触发)
- ❌ Dashboard (v1只有CLI+API)
- ❌ PDF导出 (v1只有JSON+Markdown)
- ❌ 限流 enforcement (v1警告但不强制)

---

## 19. Design Review Summary

### Design Scores (Current vs 10)

| Dimension | Current | 10-Star | Gap |
|-----------|---------|----------|-----|
| Speed | 4/10 | 30秒target, 流式输出 | 需定义SLA + 乐观UI |
| Clarity | 3/10 | 可见实际输出mockup | 需定义确切schema |
| Depth | 2/10 | 5+核心洞察分类 | 需定义taxonomy |
| Actionability | 2/10 | 每个洞察带"so what" | 需加决策钩子 |
| Agent集成 | 1/10 | GraphQL/REST API | 需优先设计API |
| Habit Formation | 1/10 | 追踪+通知+历史比 | 需加习惯循环 |

### Overall: 2.2/10

### Top 3 Gaps to Fix

1. **定义输出格式** — 用户收到什么是最重要的
2. **Agent-first API** — AI产品，agent可能是主要消费者
3. **习惯循环** — 竞品情报是持续的，需要追踪

---

## 20. CEO Review Summary

### Mode 1: SCOPE EXPANSION

**3-5年形态:** AI产品的彭博终端——创始人开干前第一个看的屏幕

**5个有价值的扩展:**
1. 实时竞品监控 + 预警
2. 预测情报 (竞品动向)
3. 分类对比矩阵
4. 市场规模 (TAM)
5. 集成层 (Linear/GitHub)

**没在想的:**
1. 数据护城河 (训练集)
2. 幽灵产品 (未记录竞品)
3. "跳过研究"心理竞争

### Mode 2: SELECTIVE EXPANSION

Top 3:
1. 竞品自动发现
2. Diff Alerts
3. 分类快照

### Mode 3: HOLD SCOPE

不做什么:
1. 实时爬虫基础设施
2. 市场规模数据
3. 企业/内网支持
4. 语音输入
5. 全REST API

### Mode 4: SCOPE REDUCTION

**MVP最小:**
1. 单URL → 产品名+Slogan+功能+定价+目标用户
2. Markdown输出
3. 基础错误处理
4. EN+CN支持
5. 30秒响应

**Final Verdict:**

挑战:
1. 冷启动——用户从哪来？
2. 差异化——别人说"我用ChatGPT"？
3. 准确率——字段错误比没有更糟

机会:
1. Agent集成
2. 每日简报
3. 竞品自动发现

---

## Appendix: Glossary

| Term | Definition |
|-----|------------|
| **竞品快照** | 输入URL后生成的结构化分析报告 |
| **多源合成** | 将多个URL的分析合并成单一报告 |
| **定位变化** | 产品在市场定位上的时间维度变化 |
| **Agent Skill** | 可被AI agent调用的工具接口 |
| **MCP** | Model Context Protocol，agent工具接口标准 |
| **Stealth Product** | 低调产品，网页信息很少 |
| **Ghost Product** | 未被记录的产品，隐藏竞品 |
| **Time-to-Value (TTV)** | 从输入到获得价值的时间 |
| **P95/P99** | 95%/99%请求的响应时间上限 |
| **SLA** | Service Level Agreement，服务等级协议 |