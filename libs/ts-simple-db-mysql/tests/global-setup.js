const { v2: compose } = require('docker-compose');

module.exports = async () => {
  process.stdout.write(`\n\nStarting docker stack for testing... `);
  await compose.upAll({ cwd: __dirname, log: false, commandOptions: ['--wait'] });
  process.stdout.write(`done.\n`);
}
