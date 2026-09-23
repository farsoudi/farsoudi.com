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

journal entries are ingested from a local machine over an ssh tunnel with the
`scripts/` client script (see `tmp.md` for the design); the server no longer
watches a journal directory.


todo
--- |
~route www to website via dns~
build website
bolden links to click
standardize font
~deploy v1 to prod via caddy~

kasra farsoudi | 2026
 --- | ---
