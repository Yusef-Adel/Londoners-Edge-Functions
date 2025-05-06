# Create Quote Edge Function Documentation

This Edge Function creates a quote for a listing by integrating with the Guesty API. It validates the input, sends the request to Guesty, and stores the resulting quote in the Supabase database.

---

## Features

- **Supabase Integration**: Retrieves the Guesty API token and stores the created quote in the `quotes` table.
- **Guesty API Integration**: Sends a quote request to the Guesty API and retrieves the response.
- **Validation**: Ensures all required fields are present and validates the input data.
- **CORS Support**: Fully handles CORS preflight requests.
- **Error Handling**: Provides detailed error messages for validation, API failures, and database issues.

---

## How to Deploy

1. **Set up Supabase Edge Functions**:
   - Follow the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) to deploy this function.
   - Ensure the environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured in your Supabase project.

2. **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.

3. **Deploy the Function**:
   - Save the code in a file named `Create-Quote.ts`.
   - Deploy using the Supabase CLI:
     ```bash
     supabase functions deploy Create-Quote
     ```

---

## API Endpoint

Once deployed, the function can be accessed via the following endpoint:
```
POST {SUPABASE_API_URL}/functions/v1/Create-Quote
```

Replace `{SUPABASE_API_URL}` with your Supabase project's API URL.

---

## Request Structure

### CORS Preflight Request
**Method**: `OPTIONS`  
No body or additional headers required.

### Create Quote Request
**Method**: `POST`  
**Headers**:
- `Authorization`: Bearer token with appropriate access permissions.
- `Content-Type`: `application/json`

**Body**:
```json
{
  "check_in_date_localized": "2025-06-01",
  "check_out_date_localized": "2025-06-07",
  "listing_id": "abc123",
  "source": "website",
  "guests_count": 2,
  "ignore_calendar": false,
  "ignore_terms": false,
  "ignore_blocks": false,
  "coupon_code": "SUMMER10"
}
```

---

## Response Structure

### Success Response
**Status Code**: `200`  
**Body**:
```json
{
  "success": true,
  "quote_id": "supabase_quote_id",
  "guesty_quote": {
    "id": "guesty_quote_id",
    "_id": "guesty_quote_id",
    "pricing": {
      "total": 1000,
      "currency": "USD"
    }
  },
  "database_record": {
    "check_in_date_localized": "2025-06-01",
    "check_out_date_localized": "2025-06-07",
    "listing_id": "abc123",
    "source": "website",
    "guests_count": 2,
    "ignore_calendar": false,
    "ignore_terms": false,
    "ignore_blocks": false,
    "coupon_code": "SUMMER10",
    "guesty_quote_id": "guesty_quote_id"
  }
}
```

### Error Responses

**Status Code**: `400` (Bad Request)  
**Body** (for missing required fields):
```json
{
  "error": "Missing required field: field_name"
}
```

**Status Code**: `401` (Unauthorized)  
**Body** (for missing authorization header):
```json
{
  "error": "Missing authorization header"
}
```

**Status Code**: `500` (Internal Server Error)  
**Body** (for unexpected errors):
```json
{
  "error": "An unexpected error occurred",
  "details": "Detailed error message"
}
```

---

## How to Call This Function in a Next.js Application

You can invoke this Edge Function from a Next.js application using the `fetch` API.

### Example Code

```typescript name=call-create-quote.ts
export async function createQuote(quoteDetails) {
  const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/functions/v1/Create-Quote`;
  const token = process.env.SUPABASE_FUNCTION_TOKEN;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quoteDetails),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create quote");
    }

    const data = await response.json();
    return data; // The full response from the Edge Function
  } catch (error) {
    console.error("Error creating quote:", error.message);
    throw error;
  }
}
```

---

## Steps to Integrate

1. **Set Up Environment Variables**:
   - Add the following to your `.env.local` file:
     ```env
     NEXT_PUBLIC_SUPABASE_API_URL=https://your-supabase-url.supabase.co
     SUPABASE_FUNCTION_TOKEN=your-function-access-token
     ```

2. **Import the Function**:
   Import and use the `createQuote` function in your Next.js components or pages.

   ```typescript name=CreateQuotePage.tsx
   import { useState } from "react";
   import { createQuote } from "./call-create-quote";

   export default function CreateQuotePage() {
     const [quoteDetails, setQuoteDetails] = useState({
       check_in_date_localized: "",
       check_out_date_localized: "",
       listing_id: "",
       source: "",
       guests_count: 1,
       ignore_calendar: false,
       ignore_terms: false,
       ignore_blocks: false,
       coupon_code: "",
     });

     const [response, setResponse] = useState(null);
     const [error, setError] = useState(null);

     async function handleCreateQuote() {
       try {
         const result = await createQuote(quoteDetails);
         setResponse(result);
       } catch (err) {
         setError(err.message);
       }
     }

     return (
       <div>
         <h1>Create Quote</h1>
         {/* Add form inputs for quoteDetails */}
         <button onClick={handleCreateQuote}>Create Quote</button>
         {error && <div>Error: {error}</div>}
         {response && <div>Success: {JSON.stringify(response)}</div>}
       </div>
     );
   }
   ```

3. **Run the Application**:
   - Start your Next.js development server:
     ```bash
     npm run dev
     ```

   - Navigate to the Create Quote page to test the integration.

---

## Additional Notes

- Ensure your Supabase project is configured with the required `guesty_tokens` and `quotes` tables.
- Handle sensitive credentials securely and never expose them in client-side code.
- Validate input carefully to avoid invalid Guesty API requests.
