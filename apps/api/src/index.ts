import 'dotenv/config';
import { createServer } from './app/server';

const server = createServer();
const port = Number(process.env.PORT ?? 3001);

server
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    server.log.info(`API listening on ${port}`);
  })
  .catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
