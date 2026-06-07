require('dotenv').config();

const { performBackup } = require('../src/utils/backup.service');

performBackup()
  .then((filePath) => {
    console.log(`Backup created: ${filePath}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`Backup failed: ${err.message}`);
    process.exit(1);
  });
