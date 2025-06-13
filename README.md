# Waves

This project uses Firebase for authentication and data storage. To prevent
accidentally exposing credentials, Firebase configuration values are loaded from
environment variables. Copy `.env.example` to `.env` and fill in your own
Firebase keys before running the app.

```bash
cp .env.example .env
# edit .env and provide the Firebase values
```

Run the development server with:

```bash
npm run dev
```

