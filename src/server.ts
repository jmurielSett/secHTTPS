import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

async function startServer() {
  try {
    // Create app with configured repositories (handles DB connection internally)
    const app = await createApp(USE_POSTGRES);

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Using ${USE_POSTGRES ? 'PostgreSQL' : 'In-Memory'} repository`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
