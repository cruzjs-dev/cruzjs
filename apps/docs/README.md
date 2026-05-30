# Starlight Starter Kit: Basics

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

```
npm create astro@latest -- --template starlight
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   └── docs/
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🌐 Deploy (Cloudflare)

The site deploys to Cloudflare Workers Static Assets. Custom domains are declared
in `wrangler.toml` — `wrangler deploy` provisions proxied DNS records + edge certs
automatically, so there are no grey-cloud / SSL-mismatch errors.

```
npm run deploy   # build + wrangler deploy
```

Domains served: `cruzjs.dev` and `www.cruzjs.dev` (canonical is www, set via
`site` in `astro.config.mjs`).

### One-time setup

1. **Migrate off the old Pages project.** `cruzjs-docs.pages.dev` and its hand-added
   DNS records (the placeholder `cruzjs.dev A 192.0.2.1`, the grey-cloud
   `www CNAME -> cruzjs-docs.pages.dev`) are superseded. After the first
   `wrangler deploy` registers both custom domains, delete those two stale DNS
   records in the Cloudflare dashboard.
2. **Apex -> www redirect.** Static assets can't redirect, so add a CF Redirect Rule:
   `Hostname equals cruzjs.dev` -> `https://www.cruzjs.dev/${1}` (301, preserve path).

## 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
