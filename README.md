# 🔐 Payment Verification API

A TypeScript-based API for verifying **Commercial Bank of Ethiopia (CBE)**, **Telebirr**, **Dashen Bank**, **Bank of Abyssinia**, and **CBEBirr** payment receipts by reference number.

> ⚠️ **Disclaimer**: This is **not an official API**. I am **not affiliated with Ethio Telecom, Telebirr, or Commercial Bank of Ethiopia (CBE)**. This tool is built for personal and developer utility purposes only and scrapes publicly available data.

---

## ✅ Features

### 🔷 CBE Payment Verification
- Verifies CBE bank transfers using reference number and account suffix
- Extracts key payment details:
  - Payer name and account
  - Receiver name and account
  - Transaction amount
  - Payment date and time
  - Reference number
  - Payment description/reason

### 🔶 Telebirr Payment Verification
- Verifies Telebirr mobile money transfers using a reference number
- Extracts key transaction details:
  - Payer name and Telebirr number
  - Credited party name and account
  - Bank name (if the transaction was made to another bank)
  - Transaction status
  - Receipt number
  - Payment date
  - Settled amount
  - Service fees and VAT
  - Total paid amount

### 🔷 Dashen Bank Payment Verification
- Verifies Dashen bank transfers using reference number
- Extracts comprehensive transaction details:
  - Sender name and account number
  - Transaction channel and service type
  - Narrative/description
  - Receiver name and phone number
  - Institution name
  - Transaction and transfer references
  - Transaction date and amount
  - Service charges, taxes, and fees breakdown
  - Total amount

### 🔶 Bank of Abyssinia Payment Verification
- Verifies Bank of Abyssinia transfers using reference number and 5-digit suffix
- Extracts key transaction details:
  - Transaction reference and details
  - Account information
  - Payment amounts and dates
  - Verification status

### 🔷 CBE Birr Payment Verification
- Verifies CBE Birr mobile money transfers using receipt number and phone number
- Extracts transaction details:
  - Receipt and transaction information
  - Payer and receiver details
  - Transaction amounts and fees
  - Payment status and timestamps
  - Ethiopian phone number validation (251 format)

### 🔷 Image-based Payment Verification
- Verifies payments by analyzing uploaded receipt images
- Uses **Mistral AI** to detect receipt type and extract transaction details
- Supports both **CBE** and **Telebirr** receipt screenshots

---

## 🌐 Hosting Limitations for `verify-telebirr`

Due to **regional restrictions** by the Telebirr system, hosting the `verify-telebirr` endpoint outside of Ethiopia (e.g., on a VPS like Hetzner or AWS) may result in failed receipt verification. Specifically:

- Telebirr's receipt pages (`https://transactioninfo.ethiotelecom.et/receipt/[REFERENCE]`) often **block or timeout** requests made from foreign IP addresses.
- This results in errors such as `ERR_FAILED`, `403`, or DNS resolution failures.

### ❌ Affected:
- VPS or cloud servers located outside Ethiopia

### ✅ Works Best On:
- Ethiopian-hosted servers (e.g., Ethio Telecom web hosting, TeleCloud VPS)
- Developers self-hosting the code on infrastructure based in Ethiopia

### 🛠 Proxy Support:
This project includes a secondary Telebirr verification relay hosted inside Ethiopia. When the primary verify-telebirr fetch fails on your foreign VPS, the server can fallback to our proxy to complete the verification.

For best results and full control, clone the repository and self-host from inside Ethiopia.

### 🔁 Skip Primary Verifier (For VPS Users)
If you know your environment cannot access the primary endpoint, set the following in your `.env`:
```bash
SKIP_PRIMARY_VERIFICATION=true
```
This will skip the primary Telebirr receipt fetch entirely and go straight to the fallback proxy — only for your local use case. Other users can still benefit from both layers.

---

## ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/onecodelab/-verifier-service-repo.git

# Navigate to the project directory
cd -verifier-service-repo

# Install dependencies
npm install
```

---

## 🧪 Usage

### 🛠 Development
```bash
npm run dev
```

### 🚀 Production Build
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

### ✅ CBE Verification
**POST** `/verify-cbe`

Verify a CBE payment using a reference number and account suffix.

**Requires API Key**

**Request Body:**
```json
{
  "reference": "REFERENCE_NUMBER",
  "accountSuffix": "ACCOUNT_SUFFIX"
}
```

---

### ✅ Telebirr Verification
**POST** `/verify-telebirr`

Verify a Telebirr payment using a reference number.

**Requires API Key**

**Request Body:**
```json
{
  "reference": "REFERENCE_NUMBER"
}
```

---

### ✅ Dashen Bank Verification
**POST** `/verify-dashen`

Verify a Dashen bank payment using a reference number.

**Requires API Key**

**Request Body:**
```json
{
  "reference": "DASHEN_REFERENCE_NUMBER"
}
```

**Response:**
```json
{
  "success": true,
  "senderName": "John Doe",
  "senderAccountNumber": "1234567890",
  "transactionChannel": "Mobile Banking",
  "serviceType": "Fund Transfer",
  "narrative": "Payment for services",
  "receiverName": "Jane Smith",
  "phoneNo": "251912345678",
  "transactionReference": "TXN123456",
  "transactionDate": "2023-06-15T10:30:00Z",
  "transactionAmount": 1000.00,
  "serviceCharge": 5.00,
  "total": 1005.00
}
```

---

### ✅ Bank of Abyssinia Verification
**POST** `/verify-abyssinia`

Verify a Bank of Abyssinia payment using a reference number and 5-digit suffix.

**Requires API Key**

**Request Body:**
```json
{
  "reference": "ABYSSINIA_REFERENCE",
  "suffix": "12345"
}
```

*Note: The suffix must be exactly 5 digits.*

---

### ✅ CBE Birr Verification
**POST** `/verify-cbebirr`

Verify a CBE Birr payment using receipt number and phone number.

**Requires API Key**

**Request Body:**
```json
{
  "receiptNumber": "RECEIPT_NUMBER",
  "phoneNumber": "251912345678"
}
```

*Note: Phone number must be in Ethiopian format (251 + 9 digits).*

---

### ✅ Image Verification
**POST** `/verify-image`

**Requires API Key**

Verify a payment by uploading an image of the receipt. This endpoint supports both CBE and Telebirr screenshots.

**Request Body:** Multipart form-data with an image file.

**Optional Query Param:** `?autoVerify=true`

When enabled, the system detects the receipt type and routes it to the correct verification flow automatically.

*Note: If the auto-detected receipt is from CBE, the request must include your Suffix (last 8 digits of your account).*

---

## 🧪 Try It (Sample cURL Commands)

### ✅ CBE
```bash
curl -X POST http://localhost:3001/verify-cbe \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "reference": "FT2513001V2G", "accountSuffix": "39003377" }'
```

### ✅ Telebirr
```bash
curl -X POST http://localhost:3001/verify-telebirr \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "reference": "CE2513001XYT" }'
```

### ✅ Dashen Bank
```bash
curl -X POST http://localhost:3001/verify-dashen \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "reference": "DASHEN_REFERENCE_NUMBER" }'
```

### ✅ Bank of Abyssinia
```bash
curl -X POST http://localhost:3001/verify-abyssinia \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "reference": "ABYSSINIA_REFERENCE", "suffix": "12345" }'
```

### ✅ CBE Birr
```bash
curl -X POST http://localhost:3001/verify-cbebirr \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "receiptNumber": "RECEIPT_NUMBER", "phoneNumber": "251912345678" }'
```

### ✅ Image
```bash
curl -X POST http://localhost:3001/verify-image?autoVerify=true \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@yourfile.jpg" \
  -F "suffix=39003377"
```

---

## ✅ Health Check
**GET** `/health`

Check if the API is running properly.

**No API Key Required**

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-06-15T12:34:56.789Z"
}
```

---

## ✅ API Information
**GET** `/`

Get information about the API and available endpoints.

**Response:**
```json
{
  "message": "Verifier API is running",
  "version": "1.0.0",
  "endpoints": ["/verify-cbe", "/verify-telebirr", "/verify-dashen", "/verify-abyssinia", "/verify-cbebirr", "/verify-image"],
  "health": "/health"
}
```

---

## 🔐 API Authentication

All verification endpoints require a valid API key.

Pass the key using either:
- **Header:** `x-api-key: YOUR_API_KEY`
- **Query:** `?apiKey=YOUR_API_KEY`

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
PORT=3001
NODE_ENV=development # or production
LOG_LEVEL=info       # or debug, error
MISTRAL_API_KEY=your_mistral_api_key # Required for image verification
SKIP_PRIMARY_VERIFICATION=false      # Set to true to bypass primary fetch
```

You can get an API key for Mistral AI from [https://mistral.ai/](https://mistral.ai/)

---

## 📝 Logging

Uses [winston](https://github.com/winstonjs/winston) for structured logging.

Log files are stored under the `logs/` directory:
- `logs/error.log` – error-level logs
- `logs/combined.log` – all logs including debug/info

`debug` logs are only visible in development mode (`NODE_ENV !== 'production'`).

To override log level manually:
```bash
LOG_LEVEL=debug
```

---

## 📦 Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/verify-cbe` | ✅ | CBE transaction by reference + suffix |
| POST | `/verify-telebirr` | ✅ | Telebirr receipt by reference |
| POST | `/verify-dashen` | ✅ | Dashen bank transaction by reference |
| POST | `/verify-abyssinia` | ✅ | Abyssinia bank transaction by reference + suffix |
| POST | `/verify-cbebirr` | ✅ | CBE Birr transaction by receipt + phone |
| POST | `/verify-image` | ✅ | Image upload for receipt OCR |
| GET | `/health` | ❌ | Health check |
| GET | `/` | ❌ | API metadata |

---

## 🧰 Technologies Used

- **Node.js** with Express
- **TypeScript**
- **Axios** – HTTP requests
- **Cheerio** – HTML parsing
- **Puppeteer** – headless browser automation (used for CBE scraping)
- **Winston** – structured logging *(to be implemented)*
- **Prisma + MySQL** – persistent storage *(to be implemented)*
- **Mistral AI** – OCR for image-based verification *(to be implemented)*

---

## 🚀 Deployment on Render

This API is designed to be deployed on [Render](https://render.com).

### Steps:
1. Push your code to GitHub
2. Connect your GitHub repository to Render
3. Set up environment variables in Render dashboard
4. Deploy as a **Web Service**
5. Configure the Docker build settings

### Required Environment Variables on Render:
- `PORT` (automatically set by Render)
- `NODE_ENV=production`
- `MISTRAL_API_KEY`
- `SKIP_PRIMARY_VERIFICATION` (optional)

---

## 📄 License

MIT License - feel free to use this in your projects!

---

## 🙏 Credits

Inspired by [Vixen878/verifier-api](https://github.com/Vixen878/verifier-api)

---

## ⚠️ Important Notes

1. **Regional Restrictions**: Telebirr verification works best when hosted in Ethiopia
2. **Rate Limiting**: Implement rate limiting to avoid being blocked by payment providers
3. **Security**: Never expose your API keys publicly
4. **Compliance**: Ensure you comply with local regulations when scraping payment data

---

**Built with ❤️ for Sosha OS**