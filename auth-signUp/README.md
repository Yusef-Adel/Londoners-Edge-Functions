# Auth Sign-Up Edge Function Documentation

This Edge Function handles user sign-up by integrating with Supabase Auth and Guesty. It performs the following steps:
- Creates a new user in Supabase Auth with the provided credentials.
- Stores additional user details in the `users` table.
- Creates a corresponding guest in Guesty using the Guesty API.
- Returns the user details along with the Guesty response.

---

## Features

- **Supabase Integration**: Handles user creation in Supabase Auth and stores additional user details in the `users` table.
- **Guesty API Integration**: Automatically creates a guest in Guesty with additional user information.
- **Error Handling**: Provides detailed error messages for input validation, Guesty API failures, and database errors.
- **CORS Support**: Fully handles CORS preflight requests.

---

## How to Deploy

1. **Set up Supabase Edge Functions**:
   - Follow the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) to deploy this function.
   - Ensure the environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are configured in your Supabase project.

2. **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.

3. **Deploy the Function**:
   - Save the code in a file named `auth-signUp.ts`.
   - Deploy using the Supabase CLI:
     ```bash
     supabase functions deploy auth-signUp
     ```

---

## API Endpoint

Once deployed, the function can be accessed via the following endpoint:
```
POST {SUPABASE_API_URL}/functions/v1/auth-signUp
```

Replace `{SUPABASE_API_URL}` with your Supabase project's API URL.

---

## Request Structure

### CORS Preflight Request
**Method**: `OPTIONS`  
No body or additional headers required.

### User Sign-Up Request
**Method**: `POST`  
**Headers**:
- `Authorization`: Bearer token with appropriate access permissions.
- `Content-Type`: `application/json`

**Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "user_type": "guest",
  "hometown": "New York",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "tags": ["VIP", "Frequent Traveler"],
  "birthday": "1990-01-01",
  "gender": "male"
}
```

---

## Response Structure

### Success Response
**Status Code**: `200`  
**Body**:
```json
{
  "status": "success",
  "message": "User registered successfully",
  "user": {
    "id": "supabase_user_id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "user_type": "guest",
    "hometown": "New York",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "tags": ["VIP", "Frequent Traveler"],
    "birthday": "1990-01-01",
    "gender": "male"
  },
  "guesty_user_id": "guesty_user_id",
  "guesty_response": {
    "status": "success",
    "message": "Guest created successfully in Guesty"
  }
}
```

### Error Responses

**Status Code**: `400` (Bad Request)  
**Body** (for missing required fields):
```json
{
  "status": "error",
  "message": "Email, password, first name, and last name are required"
}
```

**Status Code**: `500` (Internal Server Error)  
**Body**:
```json
{
  "status": "error",
  "message": "An unexpected error occurred",
  "details": "Detailed error message"
}
```

---

## How to Call This Function in a Next.js Application

You can invoke this Edge Function from a Next.js application using the `fetch` API.

### Example Code

```typescript name=call-auth-signUp.ts
export async function signUpUser(userDetails) {
  const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/functions/v1/auth-signUp`;
  const token = process.env.SUPABASE_FUNCTION_TOKEN;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userDetails),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to sign up user");
    }

    const data = await response.json();
    return data; // The full response from the Edge Function
  } catch (error) {
    console.error("Error signing up user:", error.message);
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
   Import and use the `signUpUser` function in your Next.js components or pages.

   ```typescript name=SignUpPage.tsx
   import { useState } from "react";
   import { signUpUser } from "./call-auth-signUp";

   export default function SignUpPage() {
     const [userDetails, setUserDetails] = useState({
       email: "",
       password: "",
       first_name: "",
       last_name: "",
       phone_number: "",
       user_type: "guest",
       hometown: "",
       address: {
         street: "",
         city: "",
         state: "",
         zipCode: "",
         country: "",
       },
       tags: [],
       birthday: "",
       gender: "",
     });

     const [response, setResponse] = useState(null);
     const [error, setError] = useState(null);

     async function handleSignUp() {
       try {
         const result = await signUpUser(userDetails);
         setResponse(result);
       } catch (err) {
         setError(err.message);
       }
     }

     return (
       <div>
         <h1>Sign Up</h1>
         {/* Add form inputs for userDetails here */}
         <button onClick={handleSignUp}>Sign Up</button>
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

   - Navigate to the sign-up page to test the integration.

---

## Additional Notes

- Ensure your Supabase project is configured with the required `users` table and Guesty integration.
- Handle sensitive credentials securely and never expose them in client-side code.
- Provide proper error handling for production-grade implementations.
