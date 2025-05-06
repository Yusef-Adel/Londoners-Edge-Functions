# Retrieve All Listings Edge Function Documentation

This Edge Function retrieves all listings from Guesty, transforms the data into a desired format, and returns a JSON response. It uses a Supabase database to fetch the Guesty API access token and integrates with the Guesty API.

## Function Features

- **Supabase Integration**: Fetches Guesty API tokens securely from the `guesty_tokens` table.
- **Guesty API Integration**: Retrieves listings using Guesty API and transforms them into a standardized format.
- **CORS Support**: Handles CORS preflight requests.
- **Error Handling**: Returns appropriate error messages for various failure scenarios.

---

## How to Deploy

1. **Set up Supabase Edge Functions**:
   - Follow the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) to deploy this function.
   - Ensure the environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in your Supabase project.

2. **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.

3. **Deploy the Function**:
   - Save the code in a file named `Retrieve-all-listings.ts`.
   - Deploy using the Supabase CLI:
     ```bash
     supabase functions deploy Retrieve-all-listings
     ```

---

## API Endpoint

Once deployed, the function can be accessed via the following endpoint:
```
POST {SUPABASE_API_URL}/functions/v1/Retrieve-all-listings
```

Replace `{SUPABASE_API_URL}` with your Supabase project's API URL.

---

## Request Structure

### CORS Preflight Request
**Method**: `OPTIONS`  
Use this method to handle CORS preflight requests.

### Fetch Listings Request
**Method**: `POST`  
**Headers**:
- `Authorization`: Bearer token with appropriate access permissions.
- `Content-Type`: `application/json`

**Example cURL**:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/Retrieve-all-listings' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

---

## Response Structure

### Success Response
**Status Code**: `200`  
**Body**:
```json
{
  "status": "success",
  "data": [
    {
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
  ]
}
```

### Error Response
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
export async function getListings() {
  const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/functions/v1/Retrieve-all-listings`;
  const token = process.env.SUPABASE_FUNCTION_TOKEN;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to retrieve listings");
    }

    const data = await response.json();
    return data.data; // The transformed listings data
  } catch (error) {
    console.error("Error fetching listings:", error.message);
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
   Import and use the `getListings` function in your Next.js components or pages.

   ```typescript name=index.tsx
   import { useEffect, useState } from "react";
   import { getListings } from "./call-edge-function";

   export default function Home() {
     const [listings, setListings] = useState([]);
     const [error, setError] = useState(null);

     useEffect(() => {
       async function fetchData() {
         try {
           const data = await getListings();
           setListings(data);
         } catch (err) {
           setError(err.message);
         }
       }

       fetchData();
     }, []);

     if (error) return <div>Error: {error}</div>;

     return (
       <div>
         <h1>Listings</h1>
         {listings.map((listing) => (
           <div key={listing.id}>
             <h2>{listing.title}</h2>
             <p>{listing.location}</p>
             <p>Price per night: ${listing.pricePerNight}</p>
           </div>
         ))}
       </div>
     );
   }
   ```
3. **Run the Application**:
   - Start your Next.js development server:
     ```bash
     npm run dev
     ```

   - Navigate to the page where the listings are displayed.

---

## Additional Notes

- Ensure that your Supabase project has the `guesty_tokens` table with valid access tokens for Guesty.
- Handle your Supabase Service Role Key securely and never expose it in client-side code.
- Use appropriate error handling for production-grade implementations.
