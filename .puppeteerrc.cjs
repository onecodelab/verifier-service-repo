const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer so it's part of the project folder
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
