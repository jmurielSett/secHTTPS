module.exports = {
  apps: [
    {
      name: 'auth_APP',
      script: 'dist/server.js',
      cwd: '/opt/secHTTPS/auth_APP',
      instances: 1,
      autorestart: true,
      watch: false,
    },
    {
      name: 'secHTTPS_server',
      script: 'dist/server.js',
      cwd: '/opt/secHTTPS/secHTTPS_APP',
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
