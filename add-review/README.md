# Add Review Edge Function

A Supabase Edge Function for handling review submissions with individual attribute ratings for property listings.

## Overview

This function allows guests to submit reviews for property listings with detailed ratings across multiple categories. It automatically calculates an overall rating based on individual attribute scores and stores both the review text and detailed ratings in separate database tables.


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
- `guest_id`: Unique identifier for the guest submitting the review
- `ratings`: Object containing all six rating categories

#### Optional Fields
- `review_text`: Written review content (defaults to empty string if not provided)

#### Rating Categories
Each rating must be a number between 1 and 5 (inclusive):

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
    "overall_rating": 4.5,
    "ratings": {
      "cleanliness": 4.6,
      "accuracy": 4.2,
      "check_in": 4.6,
      "communication": 4.6,
      "location": 4.6,
      "value": 4.6
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Missing Required Fields
```json
{
  "status": "error",
  "message": "Missing required fields: listing_id or guest_id"
}
```

#### 400 Bad Request - Invalid Ratings
```json
{
  "status": "error",
  "message": "Invalid ratings. All ratings must be numbers between 1 and 5"
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

### Overall Rating Calculation
The function automatically calculates the overall rating as the average of all six individual ratings:
- Formula: `(cleanliness + accuracy + check_in + communication + location + value) / 6`
- Result is rounded to 1 decimal place

### Duplicate Prevention
- Prevents users from submitting multiple reviews for the same listing
- Uses combination of `listing_id` and `guest_id` to identify duplicates

### Transaction Safety
- If saving detailed ratings fails, the main review record is automatically rolled back
- Ensures data consistency between both tables

### Input Validation
- Validates all required fields are present
- Ensures all ratings are valid numbers between 1 and 5
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
    "ratings": {
      "cleanliness": 4.6,
      "accuracy": 4.2,
      "check_in": 4.6,
      "communication": 4.6,
      "location": 4.6,
      "value": 4.6
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
    "ratings": {
      "cleanliness": 5.0,
      "accuracy": 4.8,
      "check_in": 4.9,
      "communication": 5.0,
      "location": 4.7,
      "value": 4.6
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
    "ratings": {
      "cleanliness": 4.0,
      "accuracy": 4.0,
      "check_in": 4.0,
      "communication": 4.0,
      "location": 4.0,
      "value": 4.0
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
    "ratings": {
      "cleanliness": 3.0,
      "accuracy": 3.0,
      "check_in": 3.0,
      "communication": 3.0,
      "location": 3.0,
      "value": 3.0
    }
  }'
```

#### Test invalid ratings (should return 400 error)
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listing_id": "listing_999",
    "guest_id": "user_999",
    "ratings": {
      "cleanliness": 6.0,
      "accuracy": 4.0,
      "check_in": 0.5,
      "communication": 4.0,
      "location": 4.0,
      "value": 4.0
    }
  }'
```

#### Test missing required fields (should return 400 error)
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "guest_id": "user_888",
    "ratings": {
      "cleanliness": 4.0,
      "accuracy": 4.0,
      "check_in": 4.0,
      "communication": 4.0,
      "location": 4.0,
      "value": 4.0
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
    ratings: {
      cleanliness: 4.8,
      accuracy: 4.5,
      check_in: 4.7,
      communication: 4.9,
      location: 4.6,
      value: 4.4
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
    "ratings": {
        "cleanliness": 4.7,
        "accuracy": 4.3,
        "check_in": 4.8,
        "communication": 4.5,
        "location": 4.9,
        "value": 4.2
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
- Overall rating calculations
- Database operations
- Error conditions
- Success confirmations

## Performance Notes

- Uses single database connections with connection pooling
- Minimal data validation overhead
- Efficient query patterns with proper indexing support
- Transaction-safe operations to prevent data inconsistency
