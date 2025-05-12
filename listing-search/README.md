# Listing Search API Documentation

The Listing Search API allows you to query and retrieve property listings from the Guesty API. The data is structured to include useful information such as location, title, price, and more.

## API Endpoint
```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/listing-search
```

## Features
- Query property listings using various filters such as `ids`, `nids`, `q`, `t.city`, `active`, and more.
- Handles pagination using `limit` and `skip` parameters.
- Automatically fetches and utilizes the latest Guesty token stored in the Supabase database.
- Includes a fallback mechanism to retry searches without the `availability` filter if no results are found.

---

## Request Headers
| Header                  | Value                         |
|-------------------------|-------------------------------|
| Content-Type            | `application/json`            |
| Access-Control-Allow-Origin | `*`                      |

## Request Parameters
The request body must be a JSON object with the following optional parameters:

| Parameter          | Type     | Description                                           | Example                       |
|---------------------|----------|-------------------------------------------------------|-------------------------------|
| `ids`              | `string` | Comma-separated list of listing IDs.                  | `"123,456"`                   |
| `nids`             | `string` | Comma-separated list of room IDs.                     | `"789,101"`                   |
| `viewId`           | `string` | ID of the specific view to query.                     | `"view123"`                   |
| `q`                | `string` | Search query.                                         | `"beach"`                     |
| `t.city`           | `string` | Filter by city name.                                  | `"Miami"`                     |
| `active`           | `boolean`| Filter for active listings.                          | `true`                        |
| `pmsActive`        | `boolean`| Filter for PMS active listings.                      | `false`                       |
| `integrationId`    | `string` | Filter by integration ID.                            | `"integration123"`            |
| `listed`           | `boolean`| Filter for listed properties.                        | `true`                        |
| `available`        | `object` | Availability filter.                                  | `{ "checkIn": "2025-06-01", "checkOut": "2025-06-07" }` |
| `tags`             | `string` | Comma-separated list of tags.                        | `"luxury,beachfront"`         |
| `fields`           | `string` | Comma-separated list of fields to retrieve.          | `"title,location,price"`      |
| `limit`            | `number` | Maximum number of results per page (default: 25).    | `10`                          |
| `skip`             | `number` | Number of results to skip for pagination (default: 0).| `0`                           |

---

## Example CURL Request

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/listing-search' \
--header 'Content-Type: application/json' \
--data-raw '{
  "q": "beach",
  "limit": 10,
  "t.city": "Miami",
  "available": {
    "checkIn": "2025-06-01",
    "checkOut": "2025-06-07"
  }
}'
```

---

## Example Response

### Success Response
```json
{
  "status": "success",
  "message": "Listings retrieved successfully",
  "data": [
    {
      "id": "123",
      "title": "Beachfront Paradise",
      "location": "Miami, USA",
      "area": "South Beach",
      "rating": 4.8,
      "reviews": 120,
      "bedroom": 3,
      "beds": 4,
      "bath": 2,
      "guests": 6,
      "dateRange": "Available Now",
      "pricePerNight": 200,
      "totalPrice": 1400,
      "images": ["https://example.com/image1.jpg"],
      "isFavorite": false
    }
  ],
  "totalCount": 1,
  "page": 1,
  "limit": 10
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": "Failed to fetch token: Token not found"
}
```

---

## Next.js Implementation Example

Here is an example of how to integrate the API in a Next.js application:

```javascript
// pages/api/listings.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/listing-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ error: 'Failed to fetch listings', details: errorData });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
```

### Example Usage in a React Component

```javascript
import { useState } from 'react';

export default function ListingsSearch() {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState(null);

  const searchListings = async () => {
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'beach',
          limit: 10,
          t.city: 'Miami',
          available: {
            checkIn: '2025-06-01',
            checkOut: '2025-06-07',
          },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setListings(data.data);
      } else {
        setError(data.error || 'Failed to fetch listings');
      }
    } catch (err) {
      setError(err.message || 'Internal server error');
    }
  };

  return (
    <div>
      <button onClick={searchListings}>Search Listings</button>
      {error && <p>Error: {error}</p>}
      <ul>
        {listings.map((listing) => (
          <li key={listing.id}>
            <h3>{listing.title}</h3>
            <p>{listing.location}</p>
            <p>${listing.pricePerNight} per night</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

--- 

This documentation provides a complete guide to using the API, testing it via CURL, and implementing it in a Next.js application.
