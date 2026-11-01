# Daily collection tracker (Vercel)

1. Push this folder to a GitHub repo (index.html, package.json, api/entries.js at the top level).
2. vercel.com -> Add New -> Project -> import the repo -> Deploy.
3. In the project: Storage -> Create / Connect "Upstash for Redis" (free plan). Connect it to the project.
4. Settings -> Environment Variables -> add APP_PASSWORD = a password you choose.
5. Deployments -> Redeploy (so the new variables take effect).
