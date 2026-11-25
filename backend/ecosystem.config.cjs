module.exports = {
  apps: [
    {
      name: 'dipu-khata-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '512M',
      merge_logs: true,
      time: true,
    },
  ],
};
