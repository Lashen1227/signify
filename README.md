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

Copy the example env and add your Gemini API key:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env` and set `GEMINI_API_KEY`.

## Development

Start the server and client in separate terminals:

```bash
cd server && npm run dev
cd client && npm run dev
```

## Useful scripts

- `npm run build` — Create a production build (server or client)
- `npm run dev` — Start development server with hot reload
