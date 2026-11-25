# Servers & Runtime

How RefreeG production is hosted, deployed and operated. Facts below were read off the live box on **2026-11-23**; re-verify before acting on anything time-sensitive (disk, certs, restarts).

> Two pipelines exist. **Production today = single EC2 box** (`.github/workflows/deploy.yml`, push to `main`). The ALB + Auto Scaling + RDS setup (`infra/`, `deploy-scaled.yml`) is staged, manual-only, and **not serving traffic**. See [AWS_SCALING_PLAN.md](AWS_SCALING_PLAN.md).

## Topology

```
Browser ──► CloudFront (www / apps / apex DNS)
              │
              ▼  HTTPS 443 (Let's Encrypt cert on origin)
        EC2  i-02aafc150dd7b319a  (52.4.61.249, us-east-1b)
        ├─ nginx :80/:443 (HTTP/2 + HTTP/3/QUIC)
        │    ├─ /_next/static/*  → served from disk (current/.next/static)
        │    └─ /*               → proxy 127.0.0.1:3000
        ├─ PM2 → "refreeg" (Next.js standalone server.js) :3000
        ├─ Docker → refreeg_prod_db  (Postgres 15 + pgvector) :5432
        └─ Docker → refreeg_test_db  (Postgres 15 + pgvector) :5433
External: S3 bucket refreeg-media (media + DB backups), Sentry, Paystack/Flutterwave/Breet, Didit, SMTP, ConvertKit, DeepSeek
```

## Host

|                     |                                                                            |
| ------------------- | -------------------------------------------------------------------------- |
| Instance            | `i-02aafc150dd7b319a`, **t4g.medium** (2 vCPU Graviton/arm64, 3.7 GiB RAM) |
| Region / AZ         | us-east-1 / us-east-1b                                                     |
| Public / private IP | `52.4.61.249` / `172.31.30.150`                                            |
| OS                  | Amazon Linux 2023, kernel 6.1 (aarch64)                                    |
| SSH user            | `ec2-user` (only login user; key auth only, passwords off)                 |
| SSH host key        | `ED25519 SHA256:AYIzmrwDg4bweHluU187VL5dnFWi2lpKE60M+iQpjpc`               |
| Swap                | 4 GiB file at `/mnt/data/swapfile`                                         |

### Disks

| Device      | Mount       | Size  | Holds                                                     |
| ----------- | ----------- | ----- | --------------------------------------------------------- |
| `nvme0n1p1` | `/`         | 11 GB | OS, Docker, Postgres data (`~/app/DB/db_data`), PM2 home  |
| `nvme1n1`   | `/mnt/data` | 10 GB | App releases, shared cache/logs, swapfile                 |
| `nvme2n1`   | —           | 11 GB | Attached, **not mounted** (looks like an old root volume) |

## Connecting

Key: `refreeg.ppk` (PuTTY format). Ask a maintainer for it; never commit it.

**PuTTY / plink (Windows):**

```powershell
plink -i $HOME\.ssh\refreeg.ppk ec2-user@52.4.61.249
```

**OpenSSH:** convert once with the PuTTYgen GUI (_Conversions → Export OpenSSH key_) to `refreeg.pem`, then:

```bash
ssh -i ~/.ssh/refreeg.pem ec2-user@52.4.61.249
```

`refreeg.com` resolves to CloudFront, not the box, so always connect by IP.

## Application

### Directory layout (`/mnt/data/refreeg`)

```
current -> releases/<git-sha>     # live release (atomic symlink)
releases/<sha>/                   # last 5 kept; .previous = rollback target
  server.js, node_modules/, .next/, public/, ecosystem.config.js
shared/
  secrets.env                     # runtime env, mode 600, written by CI
  logs/refreeg.{out,err}.log      # PM2 logs (api.*/frontend.* are stale, pre-Sep)
  next-image-cache/               # symlinked into each release's .next/cache/images
  image-cache/                    # cause cover cache
remote-deploy.sh, rollback.sh     # copied in by CI each deploy
```

### Process manager

- PM2 7.0.1, single app **`refreeg`**, fork mode, 1 instance, port 3000, `HOSTNAME=0.0.0.0`.
- Config: [ecosystem.config.js](../ecosystem.config.js). It reads `shared/secrets.env` directly, so a bare `pm2 restart refreeg` keeps its env.
- Limits: `max_memory_restart 900M`, `--max-old-space-size=640`, `max_restarts 10`, `min_uptime 10s`.
- Boot: systemd `pm2-ec2-user.service` runs `pm2 resurrect` from `~/.pm2/dump.pm2` (updated by `pm2 save` in each deploy).
- Node 22 (NodeSource RPM), npm 10.

One Next.js process serves both `www.refreeg.com` and `apps.refreeg.com`. `middleware.ts` picks routes by `Host` header.

### Environment

`shared/secrets.env` is regenerated from GitHub Actions secrets on every deploy. Full key list: the _Create secrets env file_ step in [deploy.yml](../.github/workflows/deploy.yml). On the box it also has `GOOGLE_CLIENT_SECRET`, which the workflow doesn't write (a leftover from a manual edit; it gets dropped on the next deploy unless it's added to the workflow).

`NEXT_PUBLIC_*` values are **baked in at build time** on the runner. Changing them in `secrets.env` alone does nothing; redeploy instead.

## nginx

- Version 1.28.3, systemd `nginx.service`. Live config: `/etc/nginx/nginx.conf` (inline server blocks; `conf.d/` is empty).
- `refreeg.com` → 301 to `https://www.refreeg.com`.
- `www.refreeg.com` → proxies everything to `:3000`. (No static `alias` block on www, unlike apex/apps.)
- `apps.refreeg.com` → same proxy plus `/_next/static/` from disk, then a trailing `return 301 https://www.refreeg.com…` that is unreachable after `location /`.
- Headers set: HSTS (1y, includeSubDomains), `X-Frame-Options SAMEORIGIN`, COOP `same-origin-allow-popups`, `Alt-Svc h3`.
- gzip on (level 5), `client_max_body_size` default (1 MB) on live. The repo copy sets 20M.
- Logs: `/var/log/nginx/`, logrotate daily, keep 10.

The repo [nginx/nginx.conf](../nginx/nginx.conf) is **out of date** compared with the live file (no TLS, no QUIC, different body size). Treat the server as the source of truth and dump it with `sudo nginx -T` before editing.

### TLS

Certbot 2.6 with the `certbot-renew.timer` (twice daily).

| Cert               | Domains   | Expires                                        |
| ------------------ | --------- | ---------------------------------------------- |
| `www.refreeg.com`  | www, apex | 2026-12-27                                     |
| `apps.refreeg.com` | apps      | 2027-02-15                                     |
| `new.refreeg.com`  | new       | **expired 2026-08-18**, unused, safe to delete |

## Database

- Postgres **15.17 + pgvector** in Docker container `refreeg_prod_db` (`pgvector/pgvector:pg15`, `restart: unless-stopped`, `max_connections=5000`).
- Compose file: `~/app/DB/docker-compose.yml` (driven by env vars). Data is bind-mounted from `~/app/DB/db_data` (about 140 MB, on the **root** disk).
- Database name `postgres`, schema `public`, about 46 MB. Extensions: pgcrypto, uuid-ossp, moddatetime, pg_stat_statements.
- The app connects via `127.0.0.1:5432`. The `postgresql` systemd unit is inactive; that's expected.
- `refreeg_test_db` (same image, named volume `refreeg_test_pgdata`) runs on **:5433**.

Shell in:

```bash
sudo docker exec -it refreeg_prod_db psql -U refreeg -d postgres
```

### Migrations

CI runs `prisma migrate deploy` before building. It opens an SSH tunnel through this box (`-L 15432:<db host>:5432`) because the runner can't reach the DB directly.

### Backups

- Cron (`ec2-user`): `30 3 * * *` runs `~/scripts/backup-db.sh`.
- It runs `pg_dump --format=custom` inside the container and uploads to `s3://refreeg-media/db-backups/refreeg-db-backup-<UTC ts>.dump`. Each dump is about 4.6 MB.
- Log: `/var/log/refreeg-db-backup.log`. Last verified run: 2026-11-23 03:30 UTC, OK.
- No retention or lifecycle rule is set in the script; check the S3 bucket's lifecycle policy.

Restore (into an empty DB):

```bash
aws s3 cp s3://refreeg-media/db-backups/<file>.dump /tmp/r.dump
sudo docker exec -i refreeg_prod_db pg_restore --no-owner -U refreeg -d postgres --clean < /tmp/r.dump
```

## Deploy flow (`deploy.yml`, push to `main`)

1. **test**: install, lint, `test:no-coverage`.
2. **build-and-deploy** (GitHub runner, not the box):
   1. SSH tunnel, then `prisma migrate deploy`.
   2. `pnpm run build` with `NEXT_PUBLIC_*` and Sentry env.
   3. Package `.next/standalone`, `public`, `.next/static`, `ecosystem.config.js` and the arm64 `sharp` tree into `deploy-<sha>.tar.gz`.
   4. Write `secrets.env`, then scp the tarball, secrets and both scripts to `/mnt/data/refreeg/`.
   5. Run [scripts/remote-deploy.sh](../scripts/remote-deploy.sh): disk guard (≥200 MB), extract to `releases/<sha>`, record `.previous`, swap the `current` symlink, `pm2 reload`, `pm2 save`, warm the image caches, keep 5 releases, truncate logs over 20 MB.
   6. Health check: `https://refreeg.com/api/health`, 3 tries.
   7. On failure: [scripts/rollback.sh](../scripts/rollback.sh) points `current` at `.previous` and restarts PM2.
3. A manual `workflow_dispatch` with `send_recovery_emails` also runs `scripts/send-recovery-emails.ts`.

`pm2 reload` in fork mode is **not zero-downtime**. Expect a few seconds of 502s per deploy.

## Operations cheat-sheet

```bash
pm2 list                                   # status, restarts, memory
pm2 logs refreeg --lines 200               # tail app logs
pm2 reload refreeg                         # restart app (keeps env)
bash /mnt/data/refreeg/rollback.sh         # manual rollback to previous release
readlink -f /mnt/data/refreeg/current      # which sha is live
curl -s localhost:3000/api/health          # local health
sudo nginx -t && sudo systemctl reload nginx
sudo docker ps                             # DB containers
sudo certbot certificates                  # cert expiry
df -h / /mnt/data                          # disk
```

## Other things on the box

- `~/scripts/`: `backup-db.sh`, `setup-db-backup-cron.sh`, `presign-cause-covers.sh`.
- `~/snare`, `~/.snare` (about 550 MB) and `~/recovery_output`: one-off recovery tooling, not part of the app.
- `~/.cursor-server` (2.2 GB) and `~/.local` / `/root/.local` (1.3 GB each): editor and tool caches on the root disk.
- Amazon SSM Agent is running, so Session Manager can be used instead of SSH if IAM allows it.
- `sysstat` collects every 10 minutes (`sar` for historical CPU/mem).

## Known issues (as of 2026-11-23)

| Severity     | Issue                                                                                                                                                                                                                                          | Suggested fix                                                                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | Postgres **5432 and 5433 are reachable from the internet** (Docker publishes on `0.0.0.0`, and the security group allows it). The prod DB role uses a weak password, and the full connection string sits in plaintext in `ec2-user`'s crontab. | Bind to localhost (`127.0.0.1:5432:5432` in compose), close 5432/5433 in the security group, rotate the DB password, and move the URL out of the crontab into a root-only env file.                              |
| High         | Root disk is **94% full** (756 MB free). Postgres data lives there.                                                                                                                                                                            | Delete `~/.cursor-server`, stale `~/.local`/`/root/.local` caches and old `~/.pm2/logs/*`; vacuum the journal (`journalctl --vacuum-size=200M`); consider moving `db_data` to `/mnt/data` or growing the volume. |
| Medium       | `refreeg` shows **751 PM2 restarts**. `refreeg.err.log` has repeated `LRUCache: calculateSize returned 0` unhandled rejections from Next's image optimizer.                                                                                    | Investigate the image-optimizer cache error (likely a zero-byte cached image) and check `pm2.log` for OOM-triggered restarts.                                                                                    |
| Medium       | No PM2 log rotation. `~/.pm2/pm2.log` is 69 MB. `shared/logs` is only truncated at deploy time.                                                                                                                                                | `pm2 install pm2-logrotate`.                                                                                                                                                                                     |
| Low          | Repo `nginx/nginx.conf` doesn't match production.                                                                                                                                                                                              | Copy the live config back into the repo (minus cert paths).                                                                                                                                                      |
| Low          | Expired `new.refreeg.com` cert; unmounted `nvme2n1` volume; stale `api.*`/`frontend.*` logs.                                                                                                                                                   | Clean up. Detach and snapshot the extra volume if it's unneeded.                                                                                                                                                 |
| Low          | `deploy.yml` comments say the DB is "a separate host". It's actually local Docker on the same box.                                                                                                                                             | Fix the comment.                                                                                                                                                                                                 |
