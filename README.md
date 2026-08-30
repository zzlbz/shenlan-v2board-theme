# Shenlan V2Board Theme

Shenlan（深蓝）是一套适配 [`wyx2685/v2board`](https://github.com/wyx2685/v2board) 的现代深色用户主题。

主题围绕订阅服务的日常使用重新组织了概览、套餐购买、订单支付、账户充值、节点、流量、文档、邀请奖励和用户中心，并针对桌面端与手机端完成响应式适配。

> 当前版本：`1.0.7`<br>
> 主题标识：`shenlan`  
> 主题介绍：深蓝现代用户主题

## 主要功能

- 深蓝色现代化登录页、概览页和用户中心
- 当前订阅、流量、在线设备、到期时间集中展示
- 一键复制订阅链接并提供明确的“复制成功”反馈
- 支持把当前订阅链接生成二维码，供客户端扫码导入
- 按 V2Board 后台“弹窗”标签自动展示公告，并支持查看完整详情
- 全页面桌面端与移动端悬浮返回顶部按钮
- 统一按钮悬浮、按压和键盘焦点反馈
- 套餐卡片展示支持的付款周期
- 独立订单确认页面和独立支付页面
- 账户充值页面，支持预设金额和自定义金额
- 对接 V2Board 原生订单、支付方式、二维码支付和支付状态接口
- 节点状态、使用文档、邀请奖励、流量明细、订单和服务工单
- 桌面顶部导航和手机抽屉菜单
- 手机菜单支持选中后收回、点击遮罩收回和 Esc 关闭
- 桌面及移动端流量、订单、支付和充值页面自适应

## 兼容范围

- 面板：`wyx2685/v2board`
- 浏览器：现代 Chrome、Edge、Firefox、Safari
- 终端：桌面、平板和移动设备

这是第三方用户主题，不修改 V2Board 数据库结构。账户、套餐、订单、支付、节点、文档和工单数据均来自面板原生 `/api/v1` 接口。

## 快速安装

1. 备份服务器当前主题目录。
2. 将 [`theme-package/shenlan`](theme-package/shenlan) 完整上传到 V2Board 的 `public/theme/`。
3. 确认最终路径是 `public/theme/shenlan/config.json`。
4. 在 V2Board 后台选择 `shenlan`，保存主题设置。
5. 清理站点缓存并使用无痕窗口检查页面。

完整安装、升级、缓存检查和回滚方法请阅读 [INSTALL.md](INSTALL.md)。

## 充值与支付

充值页使用 V2Board 原生余额订单：

```text
plan_id=0
period=deposit
deposit_amount=金额（分）
```

创建订单后会直接进入主题的支付页面，再使用面板已经配置的支付方式完成支付。主题不保存支付信息，也不自行处理余额入账。

## 本地开发

建议使用 Node.js 18 或更高版本，以及 pnpm 10/11。

```bash
pnpm install
pnpm dev
```

开发地址：

```text
http://127.0.0.1:5173/theme/shenlan/
```

开发环境使用演示数据，生产构建会调用站点同源的 V2Board 接口。

## 构建

```bash
pnpm build
```

构建完成后，将以下文件同步到 `theme-package/shenlan/assets/`：

```text
dist/assets/app.js
dist/assets/app.css
```

正式发布版同时保留版本化资源 `app-1.0.7.js` 和 `app-1.0.7.css`。`dashboard.blade.php` 只引用版本化文件，以避免浏览器继续使用旧缓存。

## 仓库结构

```text
.
├─ src/                         React 主题源码
├─ theme-package/
│  └─ shenlan/                 可部署到 public/theme/ 的完整主题
│     ├─ assets/
│     ├─ config.json
│     └─ dashboard.blade.php
├─ INSTALL.md                  安装、升级与回滚说明
├─ CHANGELOG.md                版本更新记录
├─ package.json
└─ vite.config.ts
```

## 部署前检查

- 使用测试账户验证登录、套餐购买、充值、支付和订单状态。
- 确认支付网关返回 URL 或二维码时页面行为正常。
- 查看页面源代码，确认加载 `app-1.0.7.js?v=shenlan-1.0.7` 和 `app-1.0.7.css?v=shenlan-1.0.7`。
- 保留旧主题目录作为回滚副本，实际站点验证完成前不要永久删除。

## 版本记录

当前发布版本为 `1.0.7`，详细变化请查看 [CHANGELOG.md](CHANGELOG.md)。
