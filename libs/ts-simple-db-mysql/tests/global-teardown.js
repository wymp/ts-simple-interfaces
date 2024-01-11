const { v2: compose } = require('docker-compose');

module.exports = async () => {
  process.stdout.write(`\nStopping docker stack... `);
  await compose.down({ cwd: __dirname, log: false });
  process.stdout.write(`done.\n\n`);
}
