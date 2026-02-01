const fs = require('fs');

function extractWithRegex(htmlContent, labelPattern) {
    const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // The FIX: added 's' flag here
    const pattern = new RegExp(`${escapedLabel}.*?<\\/td>\\s*<td[^>]*>\\s*([^<]+)`, 'is');
    const match = htmlContent.match(pattern);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : null;
}

const html = fs.readFileSync('telebirr_dump.html', 'utf8');
const payerName = extractWithRegex(html, "የከፋይ ስም/Payer Name");

console.log(`Extracted Payer Name: '${payerName}'`);

if (payerName === "Zinet Selman Wabela") {
    console.log("SUCCESS: Parser works!");
} else {
    console.log("FAILURE: Parser failed.");
}
