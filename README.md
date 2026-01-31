# LINUX DO Credit 自助商店

一个基于 Astro + Cloudflare D1 + Workers 的轻量级自动发卡系统，使用 LINUX DO Credit 积分支付。

## 快速开始

### 1. 准备工作

- 一个 [Cloudflare](https://dash.cloudflare.com/) 账号
- 一个 [LinuxDo](https://linux.do/) 账号（用于获取 LINUX_DO_CLIENT_ID 与 LINUX_DO_CLIENT_SECRET）
- Node.js 18+ 环境

### 2. 克隆与安装

```bash
git clone https://github.com/Sczr0/nokrai.xtower.site.git
cd nokrai.xtower.site
npm install
```

### 3. 配置项目

修改 `src/config.js` 文件，填入你的商品信息：

```javascript
export const siteConfig = {
  productName: "LinuxDo 邀请码",
  price: "500.00", // 价格
  // ... 其他配置
};
```

### 4. 配置环境变量

在 Cloudflare Dashboard 中创建 D1 数据库，并获取 Connect 应用的 Client ID 和 Secret。

复制 `.dev.vars.example` 为 `.dev.vars`（本地开发用）：

```ini
PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
LINUX_DO_CLIENT_ID=your_client_id
LINUX_DO_CLIENT_SECRET=your_client_secret
```

### 5. 初始化数据库

```bash
# 创建本地数据库表
npx wrangler d1 execute invite_codes --local --file=./db/schema.sql

# 导入一些测试数据
npx wrangler d1 execute invite_codes --local --command="INSERT INTO invite_codes (code) VALUES ('TEST-CODE-123')"
```

### 6. 本地运行

```bash
npm run dev
```

## 部署上线

1. 在 Cloudflare Dashboard 创建一个 Pages 项目。
2. 绑定你的 GitHub 仓库。
3. 在设置中添加环境变量（Client ID, Secret 等）。
4. 绑定 D1 数据库。

## 目录结构

```
src/
├── config.js        # 全局配置文件（修改这里即可）
├── pages/
│   ├── api/         # 后端 API (支付、回调)
│   └── index.astro  # 前端主页
├── data/            # 静态数据
└── styles/          # 样式文件
```

## 许可证

MIT License
