# Coach House Music Studios — Booking System

A full studio booking system with email notifications via Resend.

## Deploy to Vercel (5 minutes)

1. Upload this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. Hit Deploy — done
4. Go to Settings tab in the app, paste your Resend API key

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Email Setup

1. Sign up at resend.com (free)
2. Add and verify your domain (coachhousemusic.uk)
3. Create an API key
4. In the app → Settings tab → paste API key + from email

## Custom Domain on Vercel

1. Vercel dashboard → your project → Settings → Domains
2. Add `booking.coachhousemusic.uk`
3. In Cloudflare DNS add a CNAME: `booking` → `cname.vercel-dns.com`
