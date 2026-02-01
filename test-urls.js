const axios = require('axios');
const { load } = require('cheerio');

async function testUrl(url) {
    console.log(`Testing: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000
        });
        console.log(`Status: ${response.status}`);
        // Log a bit of the body to see what's there
        const body = response.data.toString();
        console.log(`Body snippet: ${body.substring(0, 500).replace(/\s+/g, ' ')}`);
        return true;
    } catch (error) {
        console.log(`Error: ${error.message}`);
        return false;
    }
}

(async () => {
    const ref = 'FT25339CH41W';
    const suffix = '16408';

    // Try Abyssinia new format
    await testUrl(`https://cs.bankofabyssinia.com/slip/?trx=${ref}${suffix}`);

    // Try Abyssinia with reference only (maybe suffix is embedded?)
    await testUrl(`https://cs.bankofabyssinia.com/slip/?trx=${ref}`);

    // Try CBE format just in case the user is mistaken about the bank
    // Note: CBE often uses :100 port which might be blocked or specific
    await testUrl(`https://apps.cbe.com.et:100/?id=${ref}${suffix}`);
})();
