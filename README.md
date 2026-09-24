# [ [www.farsoudi.com](https://www.farsoudi.com) source code ]

```
steps to host my own website incase i forget lol

0) clone repo & cd into repo
1) $ cp .env.dist .env
2) change env vars
3) $ source source-me
4) $ up                     # dev: hot reload (node --watch + tailwind --watch)
   or
   $ up --prod              # prod: source baked into image, no hot reload
5) route caddy / nginx to point farsoudi.com -> 3001
```

`up` applies the journal schema automatically when the db is first initialized
(`schema/schema.sql` is mounted into the db container's
`/docker-entrypoint-initdb.d`). It does **not** run again on an existing
`./mysql_data`; re-apply manually if needed (see below).

## journal entries

Entries live in the database, not on the server filesystem. Ingest/delete them
from your own machine with `scripts/manage-journal.js` (see `tmp.md`).

```
0) schema: auto-applied on first db init. for an existing database, apply it:
   $ docker compose exec -T db sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < schema/schema.sql
1) $ cp scripts/config.example.yaml scripts/config.yaml
   $ cp scripts/env.example         scripts/.env
   $ chmod 600 scripts/.env
2) edit scripts/config.yaml (connections; reference secrets as ${VAR})
   and scripts/.env (the actual user/pass values)
3) $ npm install
4) $ npm run journal -- add      # pick a file, upsert
   $ npm run journal -- delete   # pick an entry, delete
   $ npm run journal -- list
   add --dry-run to preview without writing
```

`scripts/config.yaml` and `scripts/.env` are gitignored (and dockerignored, so
secrets never enter the image).

For a `kind: remote` connection the script opens an ssh tunnel and picks a free
local port from `tunnel.port_start`. The `db` service in `docker-compose.yml`
publishes `127.0.0.1:3306:3306` on the server (loopback only) so the tunnel can
reach MySQL.


todo
--- |
~route www to website via dns~
build website
bolden links to click
standardize font
~deploy v1 to prod via caddy~

kasra farsoudi | 2026
 --- | ---
