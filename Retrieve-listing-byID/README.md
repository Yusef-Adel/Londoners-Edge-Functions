# Retrieve Listing by ID Edge Function Documentation

This Edge Function retrieves a specific listing from Guesty using the listing ID provided in the request body. It fetches the listing details from the Guesty API, transforms the data into a desired format, and returns a JSON response. The function uses a Supabase database to fetch the Guesty API access token.

---

## Function Features

- **Supabase Integration**: Securely fetches Guesty API tokens from the `guesty_tokens` table.
- **Guesty API Integration**: Retrieves a listing by ID using the Guesty API and transforms the response.
- **CORS Support**: Fully handles CORS preflight requests.
- **Error Handling**: Returns appropriate error messages for missing parameters or API failures.

---

## How to Deploy

1. **Set up Supabase Edge Functions**:
   - Follow the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) to deploy this function.
   - Ensure the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in your Supabase project.

2. **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.

3. **Deploy the Function**:
   - Save the code in a file named `Retrieve-listing-byID.ts`.
   - Deploy using the Supabase CLI:
     ```bash
     supabase functions deploy Retrieve-listing-byID
     ```

---

## API Endpoint

Once deployed, the function can be accessed via the following endpoint:
```
POST {SUPABASE_API_URL}/functions/v1/Retrieve-listing-byID
```

Replace `{SUPABASE_API_URL}` with your Supabase project's API URL.

---

## Request Structure

### CORS Preflight Request
**Method**: `OPTIONS`  
Use this method to handle CORS preflight requests.

### Fetch Listing by ID Request
**Method**: `POST`  
**Headers**:
- `Authorization`: Bearer token with appropriate access permissions.
- `Content-Type`: `application/json`

**Body**:
```json
{
  "id": "listing_id_here"
}
```

**Example cURL**:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/Retrieve-listing-byID' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"id":"listing_id_here"}'
```

---

## Response Structure

### Success Response
**Status Code**: `200`  
**Body**:
```json
{
  "status": "success",
  "data": {
    "id": "listing_id",
    "title": "Listing Title",
    "location": "City, Country",
    "area": "Street Address",
    "rating": 4.5,
    "reviews": 120,
    "bedroom": 2,
    "beds": 3,
    "bath": 2,
    "guests": 4,
    "dateRange": "Available Now",
    "pricePerNight": 100,
    "totalPrice": 100,
    "images": ["image1_url", "image2_url"],
    "isFavorite": false
  }
}
```

### Error Response
**Status Code**: `400`  
**Body** (for missing listing ID):
```json
{
  "status": "error",
  "message": "Listing ID is required in request body"
}
```

**Status Code**: `500`  
**Body**:
```json
{
  "status": "error",
  "message": "Error message describing the issue."
}
```

---

## How to Call This Function in a Next.js Application

You can invoke this Edge Function from a Next.js application using the `fetch` API.

### Example Code

```typescript name=call-edge-function.ts
export async function getListingById(listingId) {
  const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/functions/v1/Retrieve-listing-byID`;
  const token = process.env.SUPABASE_FUNCTION_TOKEN;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: listingId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to retrieve listing");
    }

    const data = await response.json();
    return data.data; // The transformed listing data
  } catch (error) {
    console.error("Error fetching listing:", error.message);
    throw error;
  }
}
```

### Steps to Integrate

1. **Set Up Environment Variables**:
   - Add the following to your `.env.local` file:
     ```env
     NEXT_PUBLIC_SUPABASE_API_URL=https://your-supabase-url.supabase.co
     SUPABASE_FUNCTION_TOKEN=your-function-access-token
     ```

2. **Import the Function**:
   Import and use the `getListingById` function in your Next.js components or pages.

   ```typescript name=index.tsx
   import { useState } from "react";
   import { getListingById } from "./call-edge-function";

   export default function ListingPage() {
     const [listing, setListing] = useState(null);
     const [error, setError] = useState(null);

     async function handleFetchListing() {
       try {
         const data = await getListingById("your_listing_id_here");
         setListing(data);
       } catch (err) {
         setError(err.message);
       }
     }

     return (
       <div>
         <h1>Listing Details</h1>
         <button onClick={handleFetchListing}>Fetch Listing</button>
         {error && <div>Error: {error}</div>}
         {listing && (
           <div>
             <h2>{listing.title}</h2>
             <p>{listing.location}</p>
             <p>Price per night: ${listing.pricePerNight}</p>
           </div>
         )}
       </div>
     );
   }
   ```

3. **Run the Application**:
   - Start your Next.js development server:
     ```bash
     npm run dev
     ```

   - Navigate to the page where the listing details are displayed.

---

## Additional Notes

- Ensure that your Supabase project has the `guesty_tokens` table with valid access tokens for Guesty.
- Handle your Supabase Service Role Key securely and never expose it in client-side code.
- Use appropriate error handling for production-grade implementations.
