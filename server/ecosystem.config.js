// pm2 process file:  pm2 start server/ecosystem.config.js && pm2 save
module.exports = { apps: [{ name: 'yuvantara', script: 'server.js', cwd: __dirname, env: { NODE_ENV: 'production' }, max_memory_restart: '300M' }] };
