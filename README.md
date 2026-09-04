# [ [www.farsoudi.com](https://www.farsoudi.com) source code ]

```
steps to host my own website incase i forget lol

0) clone repo & cd into repo
1) $ cp .env.dist .env
2) change env vars
3) symbolic link / connect syncthing to ./journal (untracked by git)
4) $ source source-me
5) $ up                     # dev: hot reload (node --watch + tailwind --watch)
   or
   $ up --prod              # prod: source baked into image, no hot reload
6) route caddy / nginx to point farsoudi.com -> 3001
```


todo
--- |
~route www to website via dns~
setup syncthing to jornal
build website
bolden links to click
standardize font
~deploy v1 to prod via caddy~

kasra farsoudi | 2026
 --- | ---
