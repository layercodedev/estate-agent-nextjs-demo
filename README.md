This is a Voice AI Estate Agent demo, built with [Layercode](https://layercode.com) Voice Agent Platform and [Next.js](https://nextjs.org).

## Getting Started

If you haven't got a Layercode account, you can sign up for free at [https://layercode.com/signup](https://dash.layercode.com/signup).

Copy .env.example to .env and fill in the required environment variables. The following values can be found in your [Layercode dashboard](https://dash.layercode.com):

```
LAYERCODE_API_KEY=Found in your Layercode dashboard settings
NEXT_PUBLIC_LAYERCODE_AGENT_ID=Found on your Agent's page in the Layercode dashboard
LAYERCODE_WEBHOOK_SECRET=Found by clicking on the Agent Backend box in your Agent's page
```

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser and chat with your voice agent!
