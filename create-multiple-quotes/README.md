# Create Multiple Quotes Edge Function

## Overview
This edge function creates multiple quotes simultaneously in Guesty. It can either:
1. Create quotes for **specific listing IDs** you provide, or
2. **Automatically fetch all active listings** from your Guesty account and create quotes for all of them

This is based on the [Guesty Create Multiple Quotes API](https://open-api-docs.guesty.com/reference/quotesopenapicontroller_createmultiple).

## Features
- ✅ **Flexible Listing Selection**: Provide specific IDs or use all listings
- ✅ **Batch Processing**: Create multiple quotes in a single API call
- ✅ **Automatic Listing Discovery**: Fetches all active listings if none specified
- ✅ **Guest Breakdown Support**: Specify adults, children, infants, and pets
- ✅ **Comprehensive Error Handling**: Separates successful and failed quote creations
- ✅ **CORS Enabled**: Full cross-origin support
- ✅ **Detailed Response**: Returns summary statistics and individual quote details

## API Endpoint
```
POST /functions/v1/create-multiple-quotes
```

## Request Headers
```
Authorization: Bearer <your_supabase_jwt>
Content-Type: application/json
```

## Request Body Parameters

### Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `checkInDateLocalized` | string | Check-in date (YYYY-MM-DD format) |
| `checkOutDateLocalized` | string | Check-out date (YYYY-MM-DD format) |
| `guestsCount` | number | Total number of guests (minimum 1) |
| `source` | string | Booking source (e.g., "website", "direct", "fb-campaign") |

### Optional Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `listingIds` | string[] | All listings | Array of listing IDs (unitTypeIds). If omitted, uses ALL active listings |
| `channel` | string | "manual_reservations" | Booking channel (e.g., "manual_reservations", "airbnb", "bookingcom") |
| `applyPromotions` | boolean | false | Whether to apply promotional pricing |
| `count` | number | 1 | Number of units to quote |
| `rates` | array | - | Array of rate objects to apply to all quotes |
| `numberOfGuests` | object | - | Breakdown of guest types |
| `numberOfGuests.numberOfAdults` | number | - | Number of adults |
| `numberOfGuests.numberOfChildren` | number | - | Number of children |
| `numberOfGuests.numberOfInfants` | number | - | Number of infants |
| `numberOfGuests.numberOfPets` | number | - | Number of pets |
| `ignoreCalendar` | boolean | - | Ignore calendar availability |
| `ignoreTerms` | boolean | - | Ignore booking terms |
| `ignoreBlocks` | boolean | - | Ignore blocked dates |
| `couponCode` | string | - | Promotional coupon code |

## Usage Examples

### Example 1: Create Quotes for Specific Listings
```javascript
const response = await fetch('YOUR_URL/functions/v1/create-multiple-quotes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    listingIds: ['679b2773da32a800107fc7c0', '679b235b2e9626001105b891'],
    checkInDateLocalized: '2025-11-01',
    checkOutDateLocalized: '2025-11-05',
    guestsCount: 4,
    numberOfGuests: {
      numberOfAdults: 2,
      numberOfChildren: 2,
      numberOfInfants: 0,
      numberOfPets: 0
    },
    source: 'fb-campaign',
    channel: 'manual_reservations',
    applyPromotions: false,
    count: 1,
    rates: [
      { rateId: 'rate_123', amount: 150 }
    ],
    couponCode: 'SUMMER2025'
  })
});

const result = await response.json();
console.log(`Created ${result.summary.successful} quotes`);
```

### Example 2: Create Quotes for ALL Listings
```javascript
// Simply omit listingIds to use all active listings
const response = await fetch('YOUR_URL/functions/v1/create-multiple-quotes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // No listingIds - will fetch all active listings automatically
    checkInDateLocalized: '2025-08-01',
    checkOutDateLocalized: '2025-08-05',
    guestsCount: 2,
    source: 'direct'
  })
});

const result = await response.json();
console.log(`Processed ${result.summary.totalRequested} listings`);
console.log(`Successfully created ${result.summary.successful} quotes`);
console.log(`Failed: ${result.summary.failed} quotes`);
```

### Example 3: With Coupon Code and Calendar Ignoring
```javascript
const response = await fetch('YOUR_URL/functions/v1/create-multiple-quotes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    listingIds: ['listing_abc', 'listing_def'],
    checkInDateLocalized: '2025-09-15',
    checkOutDateLocalized: '2025-09-20',
    guestsCount: 3,
    source: 'website',
    ignoreCalendar: true,  // Check prices even if unavailable
    ignoreTerms: false,
    ignoreBlocks: false,
    couponCode: 'EARLYBIRD'
  })
});
```

### Example 4: Curl Command for Specific Listings (Matching Guesty Format)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/create-multiple-quotes' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "listingIds": ["679b2773da32a800107fc7c0", "679b235b2e9626001105b891"],
    "checkInDateLocalized": "2025-11-01",
    "checkOutDateLocalized": "2025-11-05",
    "guestsCount": 1,
    "source": "fb-campaign",
    "channel": "manual_reservations",
    "applyPromotions": false,
    "count": 1
  }'
```

**This generates the exact Guesty API payload format:**
```json
{
  "quotes": [
    {
      "guestsCount": 1,
      "applyPromotions": false,
      "checkInDateLocalized": "2025-11-01",
      "checkOutDateLocalized": "2025-11-05",
      "unitTypeId": "679b2773da32a800107fc7c0",
      "source": "fb-campaign",
      "channel": "manual_reservations",
      "count": 1
    },
    {
      "guestsCount": 1,
      "applyPromotions": false,
      "checkInDateLocalized": "2025-11-01",
      "checkOutDateLocalized": "2025-11-05",
      "unitTypeId": "679b235b2e9626001105b891",
      "source": "fb-campaign",
      "channel": "manual_reservations",
      "count": 1
    }
  ]
}
```

### Example 5: Curl Command for All Listings
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/create-multiple-quotes' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "checkInDateLocalized": "2025-12-01",
    "checkOutDateLocalized": "2025-12-07",
    "guestsCount": 2,
    "source": "direct"
  }'
```

## Guesty API Payload Format

This function automatically converts your request into the correct Guesty API format. Here's what happens behind the scenes:

### Your Request:
```json
{
  "listingIds": ["679b2773da32a800107fc7c0", "679b235b2e9626001105b891"],
  "checkInDateLocalized": "2025-11-01",
  "checkOutDateLocalized": "2025-11-05",
  "guestsCount": 1,
  "source": "fb-campaign",
  "channel": "manual_reservations",
  "applyPromotions": false,
  "count": 1,
  "rates": [
    { "rateId": "rate_123", "amount": 150 }
  ]
}
```

### Converted to Guesty Format:
```json
{
  "quotes": [
    {
      "guestsCount": 1,
      "applyPromotions": false,
      "checkInDateLocalized": "2025-11-01",
      "checkOutDateLocalized": "2025-11-05",
      "unitTypeId": "679b2773da32a800107fc7c0",
      "source": "fb-campaign",
      "channel": "manual_reservations",
      "count": 1,
      "rates": [
        { "rateId": "rate_123", "amount": 150 }
      ]
    },
    {
      "guestsCount": 1,
      "applyPromotions": false,
      "checkInDateLocalized": "2025-11-01",
      "checkOutDateLocalized": "2025-11-05",
      "unitTypeId": "679b235b2e9626001105b891",
      "source": "fb-campaign",
      "channel": "manual_reservations",
      "count": 1,
      "rates": [
        { "rateId": "rate_123", "amount": 150 }
      ]
    }
  ]
}
```

**Key Transformations:**
- `listingIds` array → individual quote objects with `unitTypeId`
- Each listing gets its own quote object with identical parameters
- The `rates` array (if provided) is included in each quote
- Defaults: `channel: "manual_reservations"`, `count: 1`, `applyPromotions: false`

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "summary": {
    "totalRequested": 50,
    "successful": 48,
    "failed": 2,
    "checkIn": "2025-07-01",
    "checkOut": "2025-07-07",
    "guests": 4
  },
  "quotes": [
    {
      "_id": "quote_123456",
      "listingId": "listing_abc",
      "status": "active",
      "pricing": {
        "total": 850.50,
        "currency": "USD",
        "basePrice": 700.00,
        "cleaningFee": 100.00,
        "taxAmount": 50.50
      },
      "checkInDateLocalized": "2025-07-01",
      "checkOutDateLocalized": "2025-07-07",
      "guestsCount": 4
    },
    // ... more successful quotes
  ],
  "failures": [
    {
      "listingId": "listing_xyz",
      "status": "error",
      "error": "Listing not available for these dates"
    }
  ],
  "message": "Successfully created 48 out of 50 quotes"
}
```

### Summary Object
```json
{
  "totalRequested": 50,      // Total number of quotes requested
  "successful": 48,          // Successfully created quotes
  "failed": 2,               // Failed quote attempts
  "checkIn": "2025-07-01",   // Check-in date
  "checkOut": "2025-07-07",  // Check-out date
  "guests": 4                // Number of guests
}
```

### Individual Quote Object (from Guesty)
```json
{
  "_id": "quote_id",
  "listingId": "listing_id",
  "status": "active",
  "pricing": {
    "total": 1250.00,
    "currency": "USD",
    "basePrice": 1000.00,
    "cleaningFee": 150.00,
    "serviceFee": 50.00,
    "taxAmount": 50.00
  },
  "checkInDateLocalized": "2025-07-01",
  "checkOutDateLocalized": "2025-07-07",
  "guestsCount": 4,
  "createdAt": "2025-03-01T10:30:00Z"
}
```

## Error Responses

### Missing Required Field (400)
```json
{
  "error": "Missing required field: checkInDateLocalized"
}
```

### Invalid Guest Count (400)
```json
{
  "error": "guestsCount must be at least 1"
}
```

### Invalid Date Format (400)
```json
{
  "error": "Invalid date format"
}
```

### Check-in After Check-out (400)
```json
{
  "error": "Check-in date must be before check-out date"
}
```

### No Listings Available (404)
```json
{
  "error": "No listings found in Guesty account",
  "details": "The API returned an empty or invalid response"
}
```

### No Listing IDs (400)
```json
{
  "error": "No listing IDs available",
  "message": "Either provide listingIds or ensure there are active listings in your Guesty account"
}
```

### Guesty API Error (varies)
```json
{
  "error": "Guesty API error: 400",
  "statusText": "Bad Request",
  "details": "Invalid date range or unavailable listings",
  "requestedQuotesCount": 10
}
```

### Missing Authorization (401)
```json
{
  "error": "Missing authorization header"
}
```

### Token Retrieval Failed (500)
```json
{
  "error": "Failed to retrieve Guesty API token"
}
```

## Flow Diagram

```
┌─────────────────────┐
│   Client Request    │
│  (with/without IDs) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Validate Required   │
│ Fields & Dates      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Get Guesty Token   │
│  from Database      │
└──────────┬──────────┘
           │
           ├───── listingIds provided? ────┐
           │                                │
          YES                              NO
           │                                │
           │                                ▼
           │                    ┌──────────────────┐
           │                    │ Fetch ALL Active │
           │                    │ Listings from    │
           │                    │ Guesty API       │
           │                    └────────┬─────────┘
           │                             │
           └─────────┬───────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │ Build Quote Array│
          │ (one per listing)│
          └──────────┬───────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Call Guesty API      │
          │ POST /quotes/multiple│
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Process Response     │
          │ - Successful quotes  │
          │ - Failed quotes      │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Return Summary +    │
          │  Detailed Results    │
          └──────────────────────┘
```

## Real-World Use Cases

### Use Case 1: Price Comparison Tool
```javascript
// Get quotes for all your listings for specific dates
async function compareAllListingPrices(checkIn, checkOut, guests) {
  const response = await fetch('/functions/v1/create-multiple-quotes', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      checkInDateLocalized: checkIn,
      checkOutDateLocalized: checkOut,
      guestsCount: guests,
      source: 'website'
    })
  });

  const result = await response.json();
  
  // Sort by price
  const sortedQuotes = result.quotes.sort((a, b) => 
    (a.pricing?.total || 0) - (b.pricing?.total || 0)
  );

  return {
    cheapest: sortedQuotes[0],
    mostExpensive: sortedQuotes[sortedQuotes.length - 1],
    averagePrice: sortedQuotes.reduce((sum, q) => 
      sum + (q.pricing?.total || 0), 0) / sortedQuotes.length
  };
}
```

### Use Case 2: Availability Checker
```javascript
// Check which listings are available for dates
async function checkAvailability(checkIn, checkOut, guests) {
  const response = await fetch('/functions/v1/create-multiple-quotes', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      checkInDateLocalized: checkIn,
      checkOutDateLocalized: checkOut,
      guestsCount: guests,
      source: 'website',
      ignoreCalendar: false  // Only get available listings
    })
  });

  const result = await response.json();
  
  return {
    available: result.quotes.map(q => q.listingId),
    unavailable: result.failures?.map(f => f.listingId) || [],
    totalAvailable: result.summary.successful,
    totalUnavailable: result.summary.failed
  };
}
```

### Use Case 3: Bulk Quote Creation for Specific Properties
```javascript
// Create quotes for a portfolio of premium properties
async function getPremiumQuotes(premiumListingIds, dates) {
  const response = await fetch('/functions/v1/create-multiple-quotes', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      listingIds: premiumListingIds,
      checkInDateLocalized: dates.checkIn,
      checkOutDateLocalized: dates.checkOut,
      guestsCount: dates.guests,
      source: 'website',
      couponCode: 'VIP2025'
    })
  });

  return await response.json();
}
```

### Use Case 4: Seasonal Pricing Analysis
```javascript
// Analyze pricing across different dates
async function analyzeSeasonalPricing(listingIds) {
  const dates = [
    { start: '2025-06-01', end: '2025-06-07' },  // Early summer
    { start: '2025-07-15', end: '2025-07-21' },  // Peak summer
    { start: '2025-12-20', end: '2025-12-27' }   // Holiday season
  ];

  const results = await Promise.all(
    dates.map(async (date) => {
      const response = await fetch('/functions/v1/create-multiple-quotes', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listingIds: listingIds,
          checkInDateLocalized: date.start,
          checkOutDateLocalized: date.end,
          guestsCount: 2,
          source: 'analysis'
        })
      });
      return await response.json();
    })
  );

  return results;
}
```

## Best Practices

### 1. Always Check the Summary
```javascript
const result = await response.json();
if (result.summary.failed > 0) {
  console.warn(`${result.summary.failed} quotes failed`);
  console.log('Failed listings:', result.failures);
}
```

### 2. Handle Large Listing Sets
```javascript
// If you have many listings, consider pagination or batching
const MAX_BATCH_SIZE = 100;

if (listingIds.length > MAX_BATCH_SIZE) {
  // Split into batches
  const batches = [];
  for (let i = 0; i < listingIds.length; i += MAX_BATCH_SIZE) {
    batches.push(listingIds.slice(i, i + MAX_BATCH_SIZE));
  }
  
  // Process each batch
  const allResults = await Promise.all(
    batches.map(batch => createQuotesForBatch(batch))
  );
}
```

### 3. Use Appropriate Source Values
```javascript
// Use meaningful source values for tracking
const sources = {
  WEBSITE: 'website',
  MOBILE_APP: 'mobile',
  DIRECT_BOOKING: 'direct',
  AIRBNB: 'airbnb',
  BOOKING_COM: 'bookingcom'
};
```

### 4. Error Recovery
```javascript
async function createQuotesWithRetry(params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/functions/v1/create-multiple-quotes', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (response.ok) {
        return await response.json();
      }

      if (i === maxRetries - 1) throw new Error('Max retries reached');
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

## Performance Considerations

1. **Batch Size**: Creating quotes for 100+ listings may take time. Consider batching if needed.
2. **Rate Limits**: Be aware of Guesty API rate limits when creating many quotes.
3. **Timeout**: Large batch requests may need longer timeout settings.
4. **Caching**: Consider caching quote results for frequently queried date ranges.

## Environment Variables Required

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## Database Requirements

The function requires a `guesty_tokens` table with:
- `access_token` column (Guesty API token)
- `created_at` column for sorting

## Testing Checklist

- [ ] Test with specific listing IDs (2-3 listings)
- [ ] Test without listing IDs (fetch all)
- [ ] Test with invalid dates
- [ ] Test with check-in after check-out
- [ ] Test with guests count < 1
- [ ] Test with numberOfGuests breakdown
- [ ] Test with coupon code
- [ ] Test with ignoreCalendar flags
- [ ] Test with missing required fields
- [ ] Test with invalid authorization
- [ ] Verify summary statistics match actual results
- [ ] Verify failures array contains appropriate errors

## Troubleshooting

### Issue: "No listings found"
**Solution**: Ensure you have active listings in your Guesty account.

### Issue: All quotes failing
**Solution**: Check date availability, guest count limits, and listing settings in Guesty.

### Issue: Partial failures
**Solution**: Review the `failures` array in the response for specific error messages per listing.

### Issue: Timeout errors
**Solution**: Reduce batch size by providing specific `listingIds` instead of fetching all listings.

## Related Functions
- `Create-Quote` - Create a single quote for one listing
- `Retrieve-all-listings` - Fetch all listings
- `Retrieve-listing-byID` - Get detailed listing information

## API Reference
- [Guesty Create Multiple Quotes API](https://open-api-docs.guesty.com/reference/quotesopenapicontroller_createmultiple)
- [Guesty Listings API](https://open-api-docs.guesty.com/reference/listings)

## Support
For issues or questions, check the console logs for detailed error information and request/response data.
