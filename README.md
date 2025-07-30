# [ [www.farsoudi.com](https://www.farsoudi.com) source code ]

```
steps to host my own website incase i forget lol

0) clone repo & cd into repo
1) cp .env.dist .env
2) change env vars
3) symbolic link / connect syncthing to ./journal (untracked by git)
4) docker compose up --build -d
5) route caddy / nginx to point farsoudi.com -> 3001

notes:
- source source-me # gets easy commands up,down,reup
``` 

todo
--- |
~route www to website via dns~
setup syncthing to jornal
build website
deploy v1 to prod via caddy

kasra farsoudi | 2025
 --- | ---
