const axios = require('axios');
const { load } = require('cheerio');

async function verifyAbyssinia(reference, suffix) {
    try {
        if (suffix.length !== 5) {
            throw new Error('Suffix must be exactly 5 digits');
        }

        const url = `https://www.bankofabyssinia.com/receipt/${reference}/${suffix}`;
        console.log(`Checking URL: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 15000
        });

        const $ = load(response.data);
        const transactionRef = $('td:contains("Reference")').next().text().trim();
        const accountInfo = $('td:contains("Account")').next().text().trim();
        const amount = $('td:contains("Amount")').next().text().trim();
        const date = $('td:contains("Date")').next().text().trim();
        const status = $('td:contains("Status")').next().text().trim();

        return {
            success: true,
            transactionReference: transactionRef || 'Not Found',
            accountInformation: accountInfo || 'Not Found',
            amount: amount || 'Not Found',
            date: date || 'Not Found',
            status: status || 'Not Found',
            reference,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

(async () => {
    const ref = 'FT25339CH41W';
    const suffix = '16408';
    console.log(`Starting Abyssinia relay check for ${ref}...`);
    const result = await verifyAbyssinia(ref, suffix);
    console.log("RESULT_START");
    console.log(JSON.stringify(result, null, 2));
    console.log("RESULT_END");
})();
