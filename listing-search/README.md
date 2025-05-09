# Listing Search Edge Function

This Edge Function allows you to search Guesty listings using various filters via an HTTP GET request. The function integrates with Supabase and the Guesty API to handle search queries and return results based on the provided parameters.

---

## Features

- **Pagination**: Supports `limit` and `skip` parameters for paginated results.
- **Flexible Filtering**: Allows filtering by multiple fields like `ids`, `nids`, `viewId`, `tags`, etc.
- **Nested Parameters**: Handles complex fields like `available` with nested values (e.g., `checkIn`, `checkOut`).
- **Guesty Token Management**: Automatically fetches the latest Guesty token from a Supabase database table (`guesty_tokens`).

---

## Endpoint

`GET /functions/v1/listing-search`

---

## Query Parameters

| Parameter       | Description                                                                                     | Example Value                     |
|------------------|-------------------------------------------------------------------------------------------------|-----------------------------------|
| `ids`           | Comma-separated list of listing IDs.                                                           | `abc123,def456`                  |
| `nids`          | Comma-separated list of listing NIDs.                                                          | `nid1,nid2`                      |
| `viewId`        | View ID to filter listings.                                                                    | `view1`                          |
| `q`             | Search query string.                                                                           | `beach`                          |
| `t.city`        | Filter by city.                                                                                | `Los Angeles`                    |
| `active`        | Filter active listings (`true` or `false`).                                                    | `true`                           |
| `pmsActive`     | Filter PMS-active listings (`true` or `false`).                                                | `true`                           |
| `integrationId` | Filter by integration ID.                                                                      | `integration1`                   |
| `listed`        | Filter listed properties (`true` or `false`).                                                  | `true`                           |
| `available`     | JSON object for availability, including `checkIn`, `checkOut`, etc.                            | `{"checkIn":"2023-06-01","checkOut":"2023-06-10"}` |
| `tags`          | Comma-separated list of tags.                                                                  | `tag1,tag2`                      |
| `fields`        | Comma-separated list of fields to include in the response.                                     | `field1,field2`                  |
| `sort`          | Sorting criteria.                                                                              | `price:asc`                      |
| `limit`         | Maximum number of results (default: 25, max: 100).                                             | `10`                             |
| `skip`          | Number of results to skip (default: 0).                                                        | `10`                             |

---

## Responses

- **200 OK**: Returns a JSON object with the search results.
- **400 Bad Request**: Indicates invalid parameters or missing required fields.
- **500 Internal Server Error**: Indicates a server-side error.

---

## Example Usage

### cURL

#### Request

```bash
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/listing-search?q=beach&limit=10&t.city=Los%20Angeles&active=true&available={"checkIn":"2023-06-01","checkOut":"2023-06-10"}'
```

#### Response

```json
{
  "data": [
    {
      "id": "abc123",
      "title": "Beautiful Beach House",
      "city": "Los Angeles",
      "active": true,
      "available": {
        "checkIn": "2023-06-01",
        "checkOut": "2023-06-10"
      }
    },
    {
      "id": "def456",
      "title": "Sunny Villa",
      "city": "Los Angeles",
      "active": true,
      "available": {
        "checkIn": "2023-06-01",
        "checkOut": "2023-06-10"
      }
    }
  ]
}
```

---

### Next.js Implementation

#### API Route (`pages/api/listings.js`)

```javascript name=pages/api/listings.js
export default async function handler(req, res) {
  const baseUrl = "http://127.0.0.1:54321/functions/v1/listing-search";

  try {
    const queryParams = new URLSearchParams({
      q: "beach",
      "t.city": "Los Angeles",
      active: "true",
      limit: "10",
      available: '{"checkIn":"2023-06-01","checkOut":"2023-06-10"}',
    }).toString();

    const response = await fetch(`${baseUrl}?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
```

#### Example Component (`components/ListingSearch.js`)

```javascript name=components/ListingSearch.js
import { useEffect, useState } from "react";

export default function ListingSearch() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch("/api/listings");
        const data = await response.json();
        setListings(data.data || []);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Listings</h1>
      <ul>
        {listings.map((listing) => (
          <li key={listing.id}>
            <h2>{listing.title}</h2>
            <p>City: {listing.city}</p>
            <p>Check-In: {listing.available?.checkIn}</p>
            <p>Check-Out: {listing.available?.checkOut}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Local Testing

1. Start Supabase:  
   ```bash
   supabase start
   ```

2. Invoke the function using curl or via the Next.js API route.

---

## Notes

- Ensure the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in your environment variables.
- The `guesty_tokens` table in your Supabase database must contain valid Guesty tokens.

--- 

## References

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/supabase-start)
- [Guesty API Documentation](https://docs.guesty.com/reference/listings)
