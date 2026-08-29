# Shenlan 安装、升级与回滚说明

## 一、安装前准备

Shenlan 适配 `wyx2685/v2board`。安装前请确认当前面板分支，并备份：

```text
public/theme/
```

如果服务器已经存在 `public/theme/shenlan`，请先将其改名保存，例如：

```text
public/theme/shenlan-backup-日期
```

不要在完成登录、购买、充值和支付验证前永久删除回滚目录。

## 二、上传主题

将仓库中的完整目录：

```text
theme-package/shenlan
```

上传到 V2Board：

```text
public/theme/shenlan
```

正确目录结构：

```text
public/theme/shenlan/config.json
public/theme/shenlan/dashboard.blade.php
public/theme/shenlan/assets/app-1.0.6.js
public/theme/shenlan/assets/app-1.0.6.css
```

请避免形成下面这种重复嵌套：

```text
public/theme/shenlan/shenlan/config.json
```

## 三、后台启用

1. 登录 V2Board 管理后台。
2. 进入主题或站点配置页面。
3. 选择 `shenlan`。
4. 按需配置强调色、首页标题和首页说明。
5. 保存一次主题配置。

## 四、缓存检查

清理面板、Web 服务器和 CDN 缓存后，使用无痕窗口访问网站。

查看页面源代码，确认静态资源地址包含：

```text
/theme/shenlan/assets/app-1.0.6.js?v=shenlan-1.0.6
/theme/shenlan/assets/app-1.0.6.css?v=shenlan-1.0.6
```

如果仍然加载旧资源，请依次检查：

1. 服务器上的 `dashboard.blade.php` 是否已经更新。
2. 是否上传到了正确的 `public/theme/shenlan`。
3. V2Board 后台是否重新保存了主题选择。
4. Laravel、Nginx、浏览器和 CDN 是否仍有缓存。

## 五、从 Nova 旧版升级

Shenlan 的主题标识已经由 `nova` 改为 `shenlan`。推荐保留旧目录并并行上传：

```text
public/theme/nova       旧版回滚目录
public/theme/shenlan    新版主题目录
```

上传完成后在后台切换到 `shenlan`。1.0.6 保留旧版登录状态读取兼容，正常情况下升级不会强制用户重新登录。

## 六、上线验证

请使用测试账户逐项验证：

- 登录、注册和找回密码
- 概览订阅信息和复制订阅链接
- 套餐选择、付款周期和优惠码
- 创建订单后进入支付页面
- 账户充值创建订单和支付方式加载
- 支付成功后的订单状态及余额入账
- 节点、文档、邀请奖励和流量明细
- 我的订单、服务工单和用户中心
- 桌面顶部导航及手机菜单收回
- 后台标记“弹窗”的公告自动弹出、详情打开和关闭
- 长页面滚动后显示返回顶部按钮，并能够回到页面顶部

主题本地演示只能验证前端流程，真实支付和余额到账必须在已配置支付网关的测试环境中验证。

## 七、回滚

如果上线后出现问题：

1. 在 V2Board 后台切换回原主题。
2. 恢复之前备份的主题目录。
3. 清理面板、Nginx、CDN 和浏览器缓存。
4. 使用无痕窗口确认旧资源已经恢复。

回滚只涉及主题文件与主题选择，不需要修改数据库。
