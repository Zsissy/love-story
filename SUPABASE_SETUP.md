# Supabase 云端审核配置

## 1. 创建数据表

在 Supabase SQL Editor 运行：

```sql
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  role text not null default 'member',
  status text not null default 'pending',
  avatar text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);
```

## 2. 开放表访问（用于纯前端部署）

```sql
alter table public.app_users enable row level security;

create policy "public_select_app_users"
on public.app_users
for select
to anon
using (true);

create policy "public_insert_app_users"
on public.app_users
for insert
to anon
with check (true);

create policy "public_update_app_users"
on public.app_users
for update
to anon
using (true)
with check (true);
```

## 3. 配置本地开发环境变量

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

然后填写：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4. 配置 GitHub Pages 构建环境变量

在仓库 `Settings -> Secrets and variables -> Actions` 新建：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5. 发布

推送到 `main` 后，GitHub Actions 会自动构建并部署。

