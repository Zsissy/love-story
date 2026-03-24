# Love Story

情侣纪念网页（整合页 / 五年日记 / 恋爱记录 / 旅行地图 / 登录注册审核）。

## 本地启动

```bash
npm install
npm run dev
```

## GitHub Pages

已配置自动部署工作流，推送到 `main` 会自动发布。

## 审核功能（跨设备可见）

注册审核已支持 Supabase 云端同步。  
完整配置见：

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

登录页支持“匹配码”共享模式：两人输入同一码可实时共享网站数据。

如果未配置 Supabase，系统会退回本地模式（仅当前浏览器可见）。
