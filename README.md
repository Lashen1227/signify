# Signify

Signify is AI-powered sign language recognition and translation using Google Gemini.

## Getting started

### Prerequisites

- Node.js 18 or later
- npm

### Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### Environment setup

Copy the example env files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` to set `PORT`, `HOST`, and `CLIENT_ORIGIN` as needed. The AI API key is now managed per-user through the dashboard UI — no server-side `GEMINI_API_KEY` is required.

Edit `client/.env` to configure Asgardeo auth and the API base URL.

### API key configuration

Users provide their own Google Gemini API key through the dashboard settings. This eliminates shared quota issues and gives each user full control over their API usage.

1. Sign in to the app
2. Click the settings icon in the navbar or dashboard
3. Enter your Gemini API key (get one free at [Google AI Studio](https://aistudio.google.com/apikey))
4. The key is stored in your browser's localStorage and never saved on the server

## Development

Start the server and client in separate terminals:

```bash
cd server && npm run dev
cd client && npm run dev
```

## Useful scripts

- `npm run build` — Create a production build (server or client)
- `npm run dev` — Start development server with hot reload
