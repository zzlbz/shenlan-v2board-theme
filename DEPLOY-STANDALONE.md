# Shenlan 1.0.9 前后端分离部署

支持 `wyx2685/v2board`（XiaoBoard）。原 `public/theme/shenlan` 安装方式继续可用。

## 独立静态网站（直接请求后端）

1. 为前端创建 HTTPS 静态站点，例如 `https://user.example.com`，部署在域名根目录。
2. 解压 standalone 包，把 `index.html`、`env.js`、`assets/` 上传至站点根目录。不需要 PHP、Node 服务或后台主题选择器。
3. 编辑 `env.js`，设置 `host: 'https://api.example.com'`。仅填后端域名，不加 `/api/v1`、路径、密码或密钥。
4. 同文件配置站点名称、Logo 地址、介绍和强调色。独立部署不经过 Blade，主题外观配置来自此文件。
5. 确保后端允许前端来源的跨域请求：OPTIONS、GET、POST，以及 Authorization、Content-Type 请求头。XiaoBoard 自带 CORS 中间件；服务器或 CDN 不应阻断 OPTIONS 或重复添加冲突的 CORS 头。
6. 使用无痕窗口打开前端域名，检查注册、登录、订阅、续费、流量重置、充值和订单支付。

推荐将前端部署在域名根目录。静态资源使用相对路径，但后端支付返回地址是域名根路径，不保证子目录部署的支付返回正确。

所有 `/api/v1` 请求统一发往配置的后端。登录通过 Authorization 令牌，不依赖跨域 Cookie；令牌按前端来源和后端地址隔离。换前端域名或后端地址后需要重新登录。

订阅链接、支付链接和二维码保留后端返回值，不把订阅域名或支付网关域名替换成前端域名。reCAPTCHA 管理控制台也需允许新的前端域名。

## 同域 API 反向代理

也可将 `env.js` 的 `host` 留空，在前端 Nginx 上转发 `/api/` 到后端。以下片段放在已有 HTTPS server 内，替换域名和网站路径：

```nginx
root /www/wwwroot/user.example.com;
index index.html;

location = /env.js {
    add_header Cache-Control "no-store";
    try_files $uri =404;
}
location = /index.html {
    add_header Cache-Control "no-cache";
}
location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
location /api/ {
    proxy_pass https://api.example.com;
    proxy_ssl_server_name on;
    proxy_ssl_name api.example.com;
    proxy_set_header Host api.example.com;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header Origin $http_origin;
    proxy_cache off;
}
location / {
    try_files $uri $uri/ /index.html;
}
```

直接跨域部署无需 `/api/` 代理块，其余静态缓存规则仍适用。CDN 不要缓存登录和用户 API；升级时刷新 index.html 与 env.js，带哈希资源可长期缓存。

## 支付返回与后端版本

已核对 [XiaoBoard PaymentService](https://github.com/wyx2685/v2board/blob/master/app/Services/PaymentService.php)：当前上游使用 Origin（或转发主机头）构建 `/#/order/订单号` 支付返回地址，主题已兼容该路由。异步支付回调仍必须指向可公开访问的后端，不应改到纯静态前端。

旧版后端可能用后端域名生成支付返回地址。部署前检查实际 PaymentService 是否包含 `currentBase()`；如没有，应先按面板更新说明备份并升级到支持来源返回的版本。主题无法改写支付网关内部的返回地址。最终以真实测试订单的支付返回、订单状态更新和余额/流量到账为准。

## 构建与升级

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm build:standalone
```

标准主题构建输出 `dist/assets`；分离版输出 `dist/standalone`。分离版为生产构建，不使用演示数据。

升级前备份完整静态目录及自定义 env.js。上传新 index.html 和 assets，保留自己的 env.js。核验后再清理旧资源；需要回滚时恢复备份目录。原面板主题的安装步骤见 INSTALL.md。
