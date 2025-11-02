# Add Review Edge Function

A Supabase Edge Function for handling review submissions with individual attribute ratings for property listings.

## Overview

This function allows guests to submit reviews for property listings with detailed ratings across multiple categories. The user provides an overall rating along with individual category ratings (star-based 1-5). Guest information (name and email) is retrieved from the users table using the `guest_id`, so these fields are not required in the request. The function stores both the review text and detailed ratings in separate database tables.


## API Specification

### Endpoint
```
POST /functions/v1/add-review
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

### Request Body
```json
{
  "listing_id": "string",
  "guest_id": "string", 
  "review_text": "string",
  "overall_rating": "number (1-5)",
  "ratings": {
    "cleanliness": "number (1-5)",
    "accuracy": "number (1-5)",
    "check_in": "number (1-5)",
    "communication": "number (1-5)",
    "location": "number (1-5)",
    "value": "number (1-5)"
  }
}
```

#### Required Fields
- `listing_id`: Unique identifier for the property listing
- `guest_id`: Unique identifier for the guest submitting the review (used to fetch name and email from users table)
- `overall_rating`: Overall star rating selected by the user (must be a whole number 1-5)
- `ratings`: Object containing all six rating categories

#### Optional Fields
- `review_text`: Written review content (defaults to empty string if not provided)

#### Rating Categories
Each rating must be a **whole number** between 1 and 5 (inclusive) representing star ratings:

- **cleanliness**: Cleanliness of the property
- **accuracy**: How accurate the listing description was
- **check_in**: Check-in experience rating
- **communication**: Host communication rating
- **location**: Location convenience rating
- **value**: Value for money rating

## Response Format

### Success Response (201 Created)
```json
{
  "status": "success",
  "message": "Review submitted successfully",
  "data": {
    "review_id": 1,
    "overall_rating": 5,
    "ratings": {
      "cleanliness": 5,
      "accuracy": 4,
      "check_in": 5,
      "communication": 5,
      "location": 5,
      "value": 5
    }
  }
}
```

**Note**: Guest name and email are stored in the database via the `guest_id` reference and can be retrieved by joining with the users table when displaying reviews.

### Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "status": "error",
  "message": "Missing required fields: listing_id or guest_id"
}
```

#### 400 Bad Request - Missing Overall Rating
```json
{
  "status": "error",
  "message": "Missing overall rating"
}
```

#### 400 Bad Request - Invalid Ratings
```json
{
  "status": "error",
  "message": "Invalid ratings. All ratings must be whole numbers between 1 and 5"
}
```

#### 409 Conflict - Duplicate Review
```json
{
  "status": "error",
  "message": "You have already submitted a review for this listing"
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

### Star-Based Rating System
- Overall rating is provided by the user (1-5 stars)
- All ratings must be whole numbers (1, 2, 3, 4, or 5) to match star-selection UI
- Individual category ratings for cleanliness, accuracy, check-in, communication, location, and value

### Guest Information Management
- Guest name and email are retrieved from the users table using `guest_id`
- No need to send name/email in the request - reduces data duplication
- Ensures consistent guest information across all reviews

### Duplicate Prevention
- Prevents users from submitting multiple reviews for the same listing
- Uses combination of `listing_id` and `guest_id` to identify duplicates

### Transaction Safety
- If saving detailed ratings fails, the main review record is automatically rolled back
- Ensures data consistency between both tables

### Input Validation
- Validates all required fields are present (listing_id, guest_id, overall_rating)
- Ensures all ratings are whole numbers between 1 and 5 (star ratings)
- Validates overall rating matches the star-based system
- Checks for proper data types

## Usage Examples

### Local Development
```bash
# Start Supabase locally
supabase start

# Submit a review
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_789",
    "guest_id": "guest_456",
    "review_text": "Perfect base for exploring London. Family of five fitted comfortably. Immaculately clean. Easy walk to multiple tube stations. Nice neighborhood and quiet street with very little traffic. Easy to find.",
    "overall_rating": 5,
    "ratings": {
      "cleanliness": 5,
      "accuracy": 4,
      "check_in": 5,
      "communication": 5,
      "location": 5,
      "value": 5
    }
  }'
```

### Production Testing
```bash
# Submit a review to production
curl -i --location --request POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_123",
    "guest_id": "user_456",
    "review_text": "Amazing stay! The property exceeded all expectations.",
    "overall_rating": 5,
    "ratings": {
      "cleanliness": 5,
      "accuracy": 5,
      "check_in": 5,
      "communication": 5,
      "location": 5,
      "value": 5
    }
  }'
```

### Test Different Scenarios

#### Test with minimal data (no review text)
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_456",
    "guest_id": "user_789",
    "overall_rating": 4,
    "ratings": {
      "cleanliness": 4,
      "accuracy": 4,
      "check_in": 4,
      "communication": 4,
      "location": 4,
      "value": 4
    }
  }'
```

#### Test duplicate review (should return 409 error)
```bash
# Run this after submitting the first review with same listing_id and guest_id
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_789",
    "guest_id": "guest_456",
    "review_text": "Trying to submit another review",
    "overall_rating": 3,
    "ratings": {
      "cleanliness": 3,
      "accuracy": 3,
      "check_in": 3,
      "communication": 3,
      "location": 3,
      "value": 3
    }
  }'
```

#### Test invalid ratings (should return 400 error)
```bash
# Test with non-integer ratings
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_999",
    "guest_id": "user_999",
    "overall_rating": 4.5,
    "ratings": {
      "cleanliness": 4,
      "accuracy": 4,
      "check_in": 4,
      "communication": 4,
      "location": 4,
      "value": 4
    }
  }'

# Test with out-of-range ratings
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_999",
    "guest_id": "user_999",
    "overall_rating": 6,
    "ratings": {
      "cleanliness": 6,
      "accuracy": 0,
      "check_in": 4,
      "communication": 4,
      "location": 4,
      "value": 4
    }
  }'
```

#### Test missing required fields (should return 400 error)
```bash
# Missing listing_id
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "guest_id": "user_888",
    "overall_rating": 4,
    "ratings": {
      "cleanliness": 4,
      "accuracy": 4,
      "check_in": 4,
      "communication": 4,
      "location": 4,
      "value": 4
    }
  }'

# Missing overall_rating
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_888",
    "guest_id": "user_888",
    "ratings": {
      "cleanliness": 4,
      "accuracy": 4,
      "check_in": 4,
      "communication": 4,
      "location": 4,
      "value": 4
    }
  }'
```

### JavaScript/TypeScript Client
```javascript
const { data, error } = await supabase.functions.invoke('add-review', {
  body: {
    listing_id: 'listing_789',
    guest_id: 'guest_456',
    review_text: 'Great stay! Highly recommend.',
    overall_rating: 5,
    ratings: {
      cleanliness: 5,
      accuracy: 4,
      check_in: 5,
      communication: 5,
      location: 5,
      value: 4
    }
  }
});

if (error) {
  console.error('Error submitting review:', error);
} else {
  console.log('Review submitted:', data);
}
```

### Python Client
```python
import requests

url = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/add-review"
headers = {
    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
    "Content-Type": "application/json"
}

data = {
    "listing_id": "listing_789",
    "guest_id": "guest_456",
    "review_text": "Excellent property with great amenities!",
    "overall_rating": 5,
    "ratings": {
        "cleanliness": 5,
        "accuracy": 4,
        "check_in": 5,
        "communication": 5,
        "location": 5,
        "value": 4
    }
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## Environment Variables

Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Error Handling

The function includes comprehensive error handling for:

- **Validation errors**: Invalid input data or missing required fields
- **Database errors**: Connection issues or constraint violations
- **Duplicate submissions**: Prevents multiple reviews from the same user for the same listing
- **Transaction failures**: Automatic rollback if partial data insertion occurs

## CORS Support

The function includes full CORS support with:
- Preflight request handling (OPTIONS method)
- Appropriate CORS headers for cross-origin requests
- Support for web applications

## Logging

The function provides detailed console logging for:
- Request reception and validation
- Overall rating from user input
- Guest information retrieval via guest_id
- Database operations
- Error conditions
- Success confirmations

## Database Schema Notes

### Reviews Table
The function expects the following structure for the `reviews` table:
- `review_id` (auto-generated)
- `listing_id` (text)
- `guest_id` (text) - References the users table
- `review_text` (text)
- `overall_rating` (float8 or int)
- `created_at` (timestamptz)
- `guesty_reservation_id` (text, optional)

### Review Ratings Table
Detailed ratings are stored in the `review_ratings` table:
- `rating_id` (auto-generated)
- `review_id` (references reviews table)
- `cleanliness` (float8)
- `accuracy` (float8)
- `check_in` (float8)
- `communication` (float8)
- `location` (float8)
- `value` (float8)

### Guest Information
Guest name and email are retrieved from the `users` table using the `guest_id` when displaying reviews.

## Performance Notes

- Uses single database connections with connection pooling
- Minimal data validation overhead
- Efficient query patterns with proper indexing support
- Transaction-safe operations to prevent data inconsistency
