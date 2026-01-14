
import 'dotenv/config'; // Load env vars
import { brapiClient } from '../src/data/brapi-client.js';

async function verify() {
    console.log('Testing Brapi Client...');
    const ticker = 'PETR4';

    try {
        console.log(`Fetching Quote for ${ticker}...`);
        const quote = await brapiClient.getQuote(ticker);
        console.log('Quote Result:', quote ? 'Success' : 'Failed (null)');
        if (quote) {
            console.log(`Price: ${quote.regularMarketPrice}`);
        }

        console.log(`Fetching Historical Data (1d) for ${ticker}...`);
        const history = await brapiClient.getHistoricalData(ticker, '1mo', '1d');
        console.log(`Received ${history.length} candles.`);
        if (history.length > 0) {
            console.log('First:', history[0]);
            console.log('Last:', history[history.length - 1]);
        }

        console.log('Verification Complete.');
    } catch (err) {
        console.error('Verification Failed:', err);
        process.exit(1);
    }
}

verify();
