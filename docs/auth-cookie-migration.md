# 鉴权改造对接文档：JWT 从响应体迁移至 HttpOnly Cookie

> 适用读者：负责后端（Gin 框架）改造的开发者 / AI。
> 前端已完成改造，本文档描述后端需要配合实现的契约。**在后端完成本文档要求前，登录功能将不可用。**

---

## 1. 背景

### 1.1 改造前现状
- 后端在登录 / 刷新接口的**响应体 `data` 中返回** `accessToken`、`refreshToken`、`userID`。
- 前端将 `accessToken`、`refreshToken` 存入浏览器 `localStorage`。
- 前端每次请求在 `Authorization: Bearer <accessToken>` 请求头中携带 token。
- 刷新接口通过 `Authorization: Bearer <refreshToken>` 携带 refreshToken。

### 1.2 安全问题
`localStorage` 可被页面内任意 JavaScript 读取。一旦发生 XSS（恶意脚本、被投毒的第三方依赖等），`accessToken` 与 `refreshToken` 会被直接窃取；其中 refreshToken 泄露危害更大，可被长期用于续签。

### 1.3 改造目标
将 token 改为由后端通过 **HttpOnly + Secure + SameSite Cookie** 下发。token 对前端 JavaScript 完全不可见，由浏览器在同源请求时自动携带，从根本上消除 XSS 窃取 token 的风险。

---

## 2. 改造后总体方案

| 项目 | 改造前 | 改造后 |
| --- | --- | --- |
| token 载体 | 响应体 `data` + 前端 localStorage | 后端 `Set-Cookie`（HttpOnly） |
| 请求携带 access token | 前端手动加 `Authorization` 头 | 浏览器自动携带 Cookie |
| 刷新携带 refresh token | `Authorization` 头 | 浏览器自动携带 Cookie |
| 登出 | 前端清 localStorage | 调用后端 `/admin/logout` 清 Cookie |
| 业务错误码体系 | `code`（2000/4010/4011/4012/5000） | **保持不变** |

> 业务响应码（`code` 字段）的语义与触发逻辑**完全保持不变**，前端拦截器仍按 `code` 处理。仅 token 的传递方式发生变化。

---

## 3. 前端已完成的改动（供后端理解联调行为）

- `withCredentials: true`：所有请求都会携带 Cookie。
- 移除了所有 `Authorization` 请求头逻辑、移除了 `localStorage` 中的 `accessToken` / `refreshToken`。
- 仍在 `localStorage` 保留**非敏感的 `userID`**，仅作为「前端是否已登录」的标记与页面展示用途，不参与鉴权。
- 路由守卫只判断 `userID` 是否存在；token 是否有效完全由后端在接口响应中通过 `code` 告知。
- 刷新逻辑：前端收到 `code === 4012` 时调用 `POST /admin/refresh-token`（无请求体、无自定义头，仅靠 Cookie），刷新成功后自动重放原请求。
- 登出：调用 `POST /admin/logout`。

---

## 4. 后端需要实现的接口契约

所有接口前缀为 `/api`（由 nginx 反代去除后到达后端，见第 6 节），下文路径均为去除 `/api` 后的后端路由。

### 4.1 Cookie 规范

登录成功、刷新成功时，后端需通过 `Set-Cookie` 下发以下两个 Cookie：

| Cookie 名 | 内容 | 属性 |
| --- | --- | --- |
| `access_token` | access JWT | `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900` |
| `refresh_token` | refresh JWT | `HttpOnly; Secure; SameSite=Strict; Path=/api/admin/refresh-token; Max-Age=604800` |

> **有效期（已确认）**：access token TTL = **15 分钟（900s）**，refresh token TTL = 7 天（604800s）。当前后端 `GenerateToken` 的 access 为 3600s（1 小时），需**调整为 900s**。Cookie 的 `Max-Age` 必须与对应 token 的实际 TTL 一致。

要点：
- **`HttpOnly`**：必须，禁止 JS 读取。
- **`Secure`**：生产必须（仅 HTTPS 下发送）；**本地 HTTP 调试需通过环境变量关闭**，否则浏览器不会保存 Cookie（见第 7 节）。
- **`SameSite=Strict`**：前后端同域部署，可有效防 CSRF。若未来有跨站需求再评估降级为 `Lax`。
- **`refresh_token` 的 `Path` 限定为刷新接口路径**，使其只在刷新请求中被携带，缩小暴露面。注意此 Path 是**浏览器实际请求路径**（含 `/api` 前缀），即 `/api/admin/refresh-token`。
- 后端鉴权时从 **Cookie** 读取 token（`c.Cookie("access_token")`），不再从 `Authorization` 头读取。

### 4.2 业务响应码（保持不变）

| code | 含义 | 后端行为 |
| --- | --- | --- |
| 2000 | 成功 | 正常返回 |
| 4010 | 未认证：access_token **缺失、格式非法、签名错误等无效情形** | 返回 4010，前端清登录态并跳登录页 |
| 4011 | **无权限**（已认证但无权访问该资源） | 返回 4011 |
| 4012 | access_token **已过期但格式/签名合法**（可刷新） | 返回 4012，前端会自动调刷新接口 |
| 5000 | 服务端错误 | 返回 5000 |

> **关于 4010 vs 4011（需后端调整）**：当前后端对「格式非法 / 签名错误」的 token 返回的是 4011，应**改为返回 4010**。规则统一为：token 缺失或无效 → 4010；token 仅是过期 → 4012；4011 **只**保留给「已认证但无权限」的语义。

统一响应体结构（保持不变）：
```json
{ "code": 2000, "message": "", "data": { } }
```

### 4.3 登录类接口

> **登录流程说明（重要）**：本项目账号登录是**两步流程**，`account-login` 本身**不会**直接登录成功、**不下发 token**。它只用于第一步校验账号密码并决定走哪条 2FA 分支；真正登录成功（下发 Cookie）发生在 `verify-dynamic-code` 或 `bind-dynamic-code` 成功时。

涉及接口与是否下发 Cookie：

| 接口 | 作用 | 是否下发 token Cookie |
| --- | --- | --- |
| `POST /admin/account-login` | 账号密码校验（第一步） | **否**，仅返回 `userID`（及绑定场景的 `qrCodeURL`） |
| `POST /admin/verify-dynamic-code` | 校验动态验证码（最终登录） | **是** |
| `POST /admin/bind-dynamic-code` | 绑定动态验证码（最终登录） | **是** |
| ~~`POST /admin/sms-login`~~ | 短信登录 | 本次不涉及，见下方说明 |
| ~~`POST /admin/sms-code`~~ | 发送短信验证码 | 本次不涉及，见下方说明 |

**`account-login` 改动要求**：
1. 成功时**不下发 Cookie**，响应体 `data` 仅返回 `userID`；需要 2FA 绑定时额外返回 `qrCodeURL`。逻辑与现状保持一致。

`account-login` 成功响应示例（进入动态码校验流程）：
```json
{ "code": 2000, "message": "", "data": { "userID": "123" } }
```

**`verify-dynamic-code` / `bind-dynamic-code` 改动要求**：
1. 校验成功时，**通过 `Set-Cookie` 下发 `access_token` 和 `refresh_token`**（按 4.1 规范）。
2. 响应体 `data` 中**不再返回** `accessToken`、`refreshToken`，**仍需返回 `userID`**（前端用作登录标记）。

最终登录成功响应示例：
```json
{ "code": 2000, "message": "", "data": { "userID": "123" } }
```
并附带响应头：
```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api/admin/refresh-token; Max-Age=604800
```

> **短信登录（`/admin/sms-login`、`/admin/sms-code`）本次不实现**。这两个接口当前后端未注册路由、发码为占位实现，本次 Cookie 鉴权改造**不涉及**。前端登录页虽存在「短信登录」tab，但属于暂不可用功能，后端无需为其改造；待后续单独实现时，按本文档同样的 Cookie 下发规范处理即可。

### 4.4 刷新接口 `POST /admin/refresh-token`

**改动要求**：
1. 从 **Cookie `refresh_token`** 读取 refresh token（不再从 `Authorization` 头读取）。
2. 请求**无请求体**。
3. 校验 refresh token 有效后，**同时重新 `Set-Cookie` 下发新的 `access_token` 和新的 `refresh_token`（滚动刷新）**。前端对此无特殊要求（刷新时前端不读响应体、不读自定义头，仅靠 Cookie），保持后端 `GenerateToken` 每次同时签发新 access + 新 refresh 的现状即可。新 `refresh_token` 的 Cookie 属性（`Path` / `HttpOnly` / `Secure` / `SameSite`）必须与首次下发时一致。
4. 响应体 `data` 不再需要返回 token，返回 `{ "code": 2000, "message": "" }` 即可（可附带 `userID`）。
5. refresh token 无效 / 过期时，返回非 2000（如 4010），前端会跳转登录页。

### 4.5 登出接口 `POST /admin/logout`（新增）

前端因 token 为 HttpOnly Cookie 无法自行删除，需新增此接口：
1. 通过 `Set-Cookie` 将 `access_token`、`refresh_token` 置空且 `Max-Age=0`（或设置过去的 `Expires`），使浏览器立即删除。注意删除时 **Path 必须与设置时一致**，否则删不掉（`access_token` 用 `Path=/`，`refresh_token` 用 `Path=/api/admin/refresh-token`）。
2. 返回 `{ "code": 2000, "message": "" }`。

### 4.6 业务接口（鉴权方式变更）

以下需要登录态的接口，鉴权来源从 `Authorization` 头改为 Cookie `access_token`，其余逻辑不变：
- `GET /admin/auth/article/list`、`GET /admin/auth/article/detail`、`POST /admin/auth/article/add`、`PUT /admin/auth/article/update`、`DELETE /admin/auth/article/delete`
- `GET /admin/auth/tag/list`、`GET /admin/auth/tag/article-list`、`PUT /admin/auth/tag/update`
- `GET /admin/auth/link/list`、`POST /admin/auth/link/add`、`PUT /admin/auth/link/update`、`DELETE /admin/auth/link/delete`
- `PUT /admin/auth/about-me`

---

## 5. Gin 实现参考（伪代码）

### 5.1 下发 Cookie 的辅助函数
```go
const (
    accessMaxAge  = 15 * 60        // 900s
    refreshMaxAge = 7 * 24 * 60 * 60 // 604800s
)

// isProd 控制 Secure 属性，本地 HTTP 调试时应为 false
func setAuthCookies(c *gin.Context, accessToken, refreshToken string, isProd bool) {
    // gin 的 SetCookie 第 6 个参数 secure、第 7 个 httpOnly
    // SameSite 需用 c.SetSameSite 设置
    c.SetSameSite(http.SameSiteStrictMode)
    c.SetCookie("access_token", accessToken, accessMaxAge, "/", "", isProd, true)
    c.SetSameSite(http.SameSiteStrictMode)
    // 注意 refresh_token 的 Path 含 /api 前缀（浏览器实际请求路径）
    c.SetCookie("refresh_token", refreshToken, refreshMaxAge, "/api/admin/refresh-token", "", isProd, true)
}

func clearAuthCookies(c *gin.Context, isProd bool) {
    c.SetSameSite(http.SameSiteStrictMode)
    c.SetCookie("access_token", "", -1, "/", "", isProd, true)
    c.SetSameSite(http.SameSiteStrictMode)
    c.SetCookie("refresh_token", "", -1, "/api/admin/refresh-token", "", isProd, true)
}
```

### 5.2 鉴权中间件（从 Cookie 读取）
```go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token, err := c.Cookie("access_token")
        if err != nil || token == "" {
            c.JSON(200, gin.H{"code": 4010, "message": "unauthorized", "data": nil})
            c.Abort()
            return
        }
        claims, err := parseJWT(token)
        if err != nil {
            if isExpiredErr(err) {
                // 过期但格式合法 -> 4012，前端会触发刷新
                c.JSON(200, gin.H{"code": 4012, "message": "token expired", "data": nil})
            } else {
                c.JSON(200, gin.H{"code": 4010, "message": "invalid token", "data": nil})
            }
            c.Abort()
            return
        }
        c.Set("userID", claims.UserID)
        c.Next()
    }
}
```

### 5.3 刷新接口
```go
func RefreshToken(c *gin.Context) {
    rt, err := c.Cookie("refresh_token")
    if err != nil || rt == "" {
        c.JSON(200, gin.H{"code": 4010, "message": "no refresh token", "data": nil})
        return
    }
    claims, err := parseJWT(rt)
    if err != nil {
        clearAuthCookies(c, isProd)
        c.JSON(200, gin.H{"code": 4010, "message": "invalid refresh token", "data": nil})
        return
    }
    newAccess := genAccessToken(claims.UserID)
    newRefresh := genRefreshToken(claims.UserID) // 可选滚动刷新
    setAuthCookies(c, newAccess, newRefresh, isProd)
    c.JSON(200, gin.H{"code": 2000, "message": "", "data": gin.H{"userID": claims.UserID}})
}
```

### 5.4 登出接口
```go
func Logout(c *gin.Context) {
    clearAuthCookies(c, isProd)
    c.JSON(200, gin.H{"code": 2000, "message": "", "data": nil})
}
```

---

## 6. nginx 配置要点

前后端需**同域**部署（前端静态资源与 `/api` 走同一域名），Cookie 才能在前端请求中自动携带。

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # 前端静态资源
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://backend:8080/;   # 注意末尾斜杠，去除 /api 前缀
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # 默认透传 Set-Cookie，无需特殊配置；不要使用 proxy_cookie_path 改写导致 Path 不匹配
    }
}
```

注意：
- `proxy_pass` 末尾带 `/` 会把 `/api/admin/xxx` 重写为 `/admin/xxx` 转发给后端，因此后端路由不含 `/api` 前缀。
- 但**浏览器侧的 Cookie Path 仍是 `/api/...`**，所以 `refresh_token` 的 Cookie Path 必须写 `/api/admin/refresh-token`（见 4.1 / 5.1）。
- 生产必须启用 HTTPS，否则 `Secure` Cookie 不生效。

---

## 7. 本地联调注意事项

1. **HTTP 下 Secure Cookie 不生效**：本地通过环境变量将 `isProd` 设为 `false`，使 Cookie 不带 `Secure`，否则浏览器不会保存。
2. **同源问题**：前端 dev server（如 Vite 5173）与后端（8080）端口不同属于跨站，Cookie 不会自动携带。需在前端 `vite.config.ts` 配置 proxy 把 `/api` 代理到后端，做成同源：
   ```ts
   server: {
     proxy: {
       '/api': { target: 'http://localhost:8080', changeOrigin: true }
     }
   }
   ```
3. 验证清单：
   - 登录成功后，浏览器 DevTools → Application → Cookies 能看到 `access_token`、`refresh_token`，且标记为 `HttpOnly`。
   - 业务接口请求自动带上 Cookie，返回 2000。
   - access_token 过期后，接口返回 4012，前端自动调 `/admin/refresh-token` 并重放成功。
   - 登出后 Cookie 被清除，访问受保护接口返回 4010 并跳转登录页。

---

## 8. 安全增强建议（可选）

- **CSRF**：当前依赖 `SameSite=Strict` + 同域防护已基本足够。若要更强保护，可额外下发非 HttpOnly 的 `csrf_token` Cookie，前端读取后放入自定义请求头 `X-CSRF-Token`，后端做双提交校验（此项需前后端再约定，当前未实现）。
- **单设备登录**：可在 JWT payload 中加入 `token_version` / `session_id`，并在用户表/Redis 中保存当前有效值；每次登录自增，鉴权时比对，实现「新设备登录后旧设备 token 失效」。
- **刷新滚动 + 复用检测**：refresh token 每次刷新后轮换，并检测旧 refresh token 被重复使用（可能是泄露），一旦发现立即吊销整条会话。
