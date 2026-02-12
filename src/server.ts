import { createApp } from './app';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
