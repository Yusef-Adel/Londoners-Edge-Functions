# Get Review Edge Function

A Supabase Edge Function for retrieving reviews and ratings statistics for property listings.

## Overview

This function allows you to fetch reviews for a specific property listing with comprehensive statistics including overall ratings, category-specific averages, rating distributions, and pagination support. It provides both individual review details and aggregated statistics in a single response. Each review includes the guest's full name and a profile picture (from Guesty if available, otherwise a default placeholder image).

## Database Schema

The function reads from two main tables:

### `reviews` Table
```sql
CREATE TABLE reviews (
  review_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  listing_id TEXT,
  guest_id TEXT,
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  overall_rating FLOAT
);
```

### `review_ratings` Table
```sql
CREATE TABLE review_ratings (
  rating_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  review_id BIGINT,
  cleanliness FLOAT,
  accuracy FLOAT,
  check_in FLOAT,
  communication FLOAT,
  location FLOAT,
  value FLOAT,
  FOREIGN KEY (review_id) REFERENCES reviews (review_id)
);
```

## API Specification

### Endpoint
```
GET /functions/v1/get-review
POST /functions/v1/get-review
```

### Request Methods

#### GET Method (Query Parameters)
```
GET /functions/v1/get-review?listing_id=listing_789&limit=10&offset=0&sort_by=newest
```

**Query Parameters:**
- `listing_id` (required): The listing ID to get reviews for
- `limit` (optional): Number of reviews to return (default: 20, max: 100)
- `offset` (optional): Number of reviews to skip for pagination (default: 0)
- `sort_by` (optional): Sort order - `newest`, `oldest`, `rating_high`, `rating_low` (default: `newest`)

#### POST Method (JSON Body)
```json
{
  "listing_id": "string",
  "limit": "number (optional, default: 20, max: 100)",
  "offset": "number (optional, default: 0)",
  "sort_by": "string (optional: newest|oldest|rating_high|rating_low)"
}
```

### Request Headers
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json (for POST requests only)
```

#### Required Fields
- `listing_id`: Unique identifier for the property listing

#### Optional Fields
- `limit`: Number of reviews per page (1-100, default: 20)
- `offset`: Starting position for pagination (default: 0)
- `sort_by`: Sort order for reviews

#### Sort Options
- **newest**: Most recent reviews first (default)
- **oldest**: Oldest reviews first
- **rating_high**: Highest rated reviews first
- **rating_low**: Lowest rated reviews first

## Response Format

### Success Response (200 OK)
```json
{
  "status": "success",
  "message": "Reviews retrieved successfully",
  "data": {
    "listing_id": "listing_789",
    "statistics": {
      "total_reviews": 15,
      "overall_average_rating": 4.3,
      "rating_distribution": {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 7,
        "5": 5
      },
      "category_averages": {
        "cleanliness": 4.5,
        "accuracy": 4.2,
        "check_in": 4.4,
        "communication": 4.6,
        "location": 4.3,
        "value": 4.1
      }
    },
    "reviews": [
      {
        "review_id": 1,
        "guest_id": "guest_456",
        "guest_name": "John Smith",
        "guest_picture": "https://res.cloudinary.com/guesty/image/upload/...", // or placeholder if not available
        "review_text": "Perfect base for exploring London...",
        "overall_rating": 4.5,
        "created_at": "2025-07-01T10:30:00Z",
        "ratings": {
          "cleanliness": 4.6,
          "accuracy": 4.2,
          "check_in": 4.6,
          "communication": 4.6,
          "location": 4.6,
          "value": 4.6
        }
      }
    ],
    "pagination": {
      "total_count": 15,
      "current_page": 1,
      "total_pages": 2,
      "has_next_page": true,
      "has_previous_page": false
    }
  }
}
```

### Response Data Structure

#### Statistics Object
- `total_reviews`: Total number of reviews for the listing
- `overall_average_rating`: Average of all overall ratings (rounded to 1 decimal)
- `rating_distribution`: Count of reviews by star rating (1-5)
- `category_averages`: Average ratings for each category

#### Individual Review Object
- `review_id`: Unique review identifier
- `guest_id`: ID of the guest who left the review
- `guest_name`: Full name of the guest (from Guesty, or "Anonymous Guest")
- `guest_picture`: URL to the guest's profile picture (from Guesty if available, otherwise a default placeholder: `https://img.icons8.com/?size=100&id=23264&format=png&color=000000`)
- `review_text`: Written review content
- `overall_rating`: Calculated overall rating (average of all categories)
- `created_at`: ISO timestamp when review was created
- `ratings`: Object containing all six category ratings

#### Pagination Object
- `total_count`: Total number of reviews available
- `current_page`: Current page number (1-based)
- `total_pages`: Total number of pages
- `has_next_page`: Boolean indicating if more pages exist
- `has_previous_page`: Boolean indicating if previous pages exist

### Error Responses

#### 400 Bad Request - Missing Required Field
```json
{
  "status": "error",
  "message": "Missing required field: listing_id"
}
```

#### 400 Bad Request - Missing Query Parameter (GET)
```json
{
  "status": "error",
  "message": "Missing required parameter: listing_id"
}
```

#### 405 Method Not Allowed
```json
{
  "status": "error",
  "message": "Method not allowed. Use POST or GET."
}
```

#### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": "Error description"
}
```

## Features

### Comprehensive Statistics
- **Overall average rating** calculated from all reviews
- **Rating distribution** showing count of 1-5 star reviews
- **Category averages** for all six rating attributes
- **Total review count** for the listing

### Flexible Sorting Options
- Sort by newest or oldest reviews
- Sort by highest or lowest ratings
- Default sorting by most recent reviews

### Pagination Support
- Configurable page size (1-100 reviews per page)
- Offset-based pagination
- Complete pagination metadata in response

### Dual Request Methods
- **GET method** for simple queries with URL parameters
- **POST method** for complex requests with JSON body
- Same response format for both methods

### Detailed Review Information
- Complete review text and ratings
- Individual category breakdowns
- Guest information and timestamps
- Calculated overall ratings
- **Guest profile picture**: Always included, either from Guesty or a default placeholder

## Usage Examples

### Local Development

#### GET Method - Basic Request
```bash
# Get first 10 reviews, sorted by newest
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-review?listing_id=listing_789&limit=10' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### GET Method - With Sorting and Pagination
```bash
# Get reviews 11-20, sorted by highest rating
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-review?listing_id=listing_789&limit=10&offset=10&sort_by=rating_high' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### POST Method - Basic Request
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_789",
    "limit": 10,
    "sort_by": "newest"
  }'
```

#### POST Method - With Pagination
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_789",
    "limit": 20,
    "offset": 40,
    "sort_by": "rating_low"
  }'
```

### Production Testing

#### GET Method
```bash
curl -i --location --request GET 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-review?listing_id=prod_listing_123&limit=15&sort_by=rating_high' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### POST Method
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "prod_listing_123",
    "limit": 25,
    "offset": 0,
    "sort_by": "newest"
  }'
```

### JavaScript/TypeScript Client

#### Using GET Method
```javascript
// Simple request
const response = await fetch(
  `${supabaseUrl}/functions/v1/get-review?listing_id=listing_789&limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
);
const data = await response.json();

// With pagination
const getReviews = async (listingId, page = 1, limit = 20, sortBy = 'newest') => {
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({
    listing_id: listingId,
    limit: limit.toString(),
    offset: offset.toString(),
    sort_by: sortBy
  });
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-review?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    }
  );
  
  return await response.json();
};
```

#### Using POST Method with Supabase Client
```javascript
const { data, error } = await supabase.functions.invoke('get-review', {
  body: {
    listing_id: 'listing_789',
    limit: 20,
    offset: 0,
    sort_by: 'newest'
  }
});

if (error) {
  console.error('Error fetching reviews:', error);
} else {
  console.log('Reviews data:', data);
  console.log('Statistics:', data.data.statistics);
  console.log('Reviews:', data.data.reviews);
  console.log('Pagination:', data.data.pagination);
}
```

### Python Client

#### GET Method
```python
import requests

url = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-review"
headers = {
    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"
}

params = {
    "listing_id": "listing_789",
    "limit": 15,
    "offset": 0,
    "sort_by": "rating_high"
}

response = requests.get(url, headers=headers, params=params)
data = response.json()

print("Statistics:", data['data']['statistics'])
print("Total reviews:", data['data']['pagination']['total_count'])
```

#### POST Method
```python
import requests

url = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-review"
headers = {
    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
    "Content-Type": "application/json"
}

payload = {
    "listing_id": "listing_789",
    "limit": 20,
    "offset": 0,
    "sort_by": "newest"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

# Access the data
reviews_data = data['data']
statistics = reviews_data['statistics']
reviews = reviews_data['reviews']
pagination = reviews_data['pagination']

print(f"Average rating: {statistics['overall_average_rating']}")
print(f"Total reviews: {statistics['total_reviews']}")
print(f"Category averages: {statistics['category_averages']}")
```

## Test Cases

### Successful Requests

#### Test 1: Basic GET request
```bash
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-review?listing_id=test_listing_1' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### Test 2: GET with all parameters
```bash
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-review?listing_id=test_listing_1&limit=5&offset=10&sort_by=rating_high' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### Test 3: POST method
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "test_listing_1",
    "limit": 15,
    "sort_by": "oldest"
  }'
```

### Error Cases

#### Test 4: Missing listing_id (GET)
```bash
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-review?limit=10' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### Test 5: Missing listing_id (POST)
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "limit": 10,
    "sort_by": "newest"
  }'
```

#### Test 6: Invalid HTTP method
```bash
curl -i --location --request DELETE 'http://127.0.0.1:54321/functions/v1/get-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'
```

#### Test 7: CORS preflight
```bash
curl -i --location --request OPTIONS 'http://127.0.0.1:54321/functions/v1/get-review' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: Content-Type, Authorization'
```

## Environment Variables

Ensure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Performance Considerations

### Optimizations Implemented
- **Separate queries** for paginated reviews and statistics to optimize performance
- **Efficient joins** using Supabase's select syntax
- **Limited result sets** with configurable pagination
- **Indexed queries** on listing_id for fast retrieval

### Recommended Database Indexes
```sql
-- Index for fast listing lookups
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
CREATE INDEX idx_reviews_overall_rating ON reviews(overall_rating);

-- Index for fast joins
CREATE INDEX idx_review_ratings_review_id ON review_ratings(review_id);
```

## Error Handling

The function includes comprehensive error handling for:

- **Missing parameters**: Clear error messages for required fields
- **Database errors**: Proper error propagation with details
- **Invalid sort options**: Defaults to 'newest' for invalid sort_by values
- **Pagination bounds**: Automatic limit enforcement (max 100 per page)
- **Method validation**: Supports both GET and POST methods

## CORS Support

Full CORS support included:
- Preflight request handling (OPTIONS method)
- Appropriate CORS headers for cross-origin requests
- Support for web applications and mobile apps

## Response Time

- **Typical response time**: 100-300ms for listings with moderate review counts
- **Large datasets**: Pagination helps maintain consistent performance
- **Statistics calculation**: Optimized aggregation queries
- **Caching recommended**: Consider implementing Redis or similar for frequently accessed listings

## Integration Tips

1. **Pagination**: Always implement pagination for listings with many reviews
2. **Caching**: Cache statistics data as it changes less frequently than individual reviews  
3. **Real-time updates**: Consider using Supabase real-time subscriptions for live review updates
4. **Rate limiting**: Implement rate limiting for public-facing applications
5. **Error handling**: Always handle both network and application errors gracefully
