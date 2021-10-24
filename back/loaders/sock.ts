import sockJs from 'sockjs';
import { Server } from 'http';
import Logger from './logger';
import { Container } from 'typedi';
import SockService from '../services/sock';
import config from '../config/index';
import fs from 'fs';
import { getPlatform } from '../config/util';

export default async ({ server }: { server: Server }) => {
  const echo = sockJs.createServer({ prefix: '/api/ws', log: () => {} });
  const sockService = Container.get(SockService);

  echo.on('connection', (conn) => {
    const data = fs.readFileSync(config.authConfigFile, 'utf8');
    const platform = getPlatform(conn.headers['user-agent'] || '') || 'desktop';
    const headerToken = conn.url.replace(`${conn.pathname}?token=`, '');
    if (data) {
      const { token = '', tokens = {} } = JSON.parse(data);
      if (headerToken === token || tokens[platform] === headerToken) {
        conn.write(JSON.stringify({ type: 'ping', message: 'hanhh' }));
        sockService.addClient(conn);

        conn.on('data', (message) => {
          conn.write(message);
        });

        conn.on('close', function () {
          sockService.removeClient(conn);
        });

        return;
      } else {
        conn.write(JSON.stringify({ type: 'ping', message: '404' }));
      }
    }

    conn.close('404');
  });

  echo.installHandlers(server);
};
