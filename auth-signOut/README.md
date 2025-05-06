# Auth Sign-Out Edge Function Documentation

This Edge Function handles user sign-out by invalidating the user's session using Supabase Auth. It supports optional redirection after successful sign-out.

---

## Features

- **Supabase Integration**: Signs out users by invalidating their JWT token with Supabase Auth.
- **Redirect Support**: Optionally redirects users to a specified URL after successful sign-out.
- **CORS Support**: Fully handles CORS preflight requests.
- **Error Handling**: Provides detailed error messages for missing or invalid tokens and unexpected errors.

---

## How to Deploy

1. **Set up Supabase Edge Functions**:
   - Follow the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) to deploy this function.
   - Ensure the environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured in your Supabase project.

2. **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.

3. **Deploy the Function**:
   - Save the code in a file named `auth-signOut.ts`.
   - Deploy using the Supabase CLI:
     ```bash
     supabase functions deploy auth-signOut
     ```

---

## API Endpoint

Once deployed, the function can be accessed via the following endpoint:
```
POST {SUPABASE_API_URL}/functions/v1/auth-signOut
```

Replace `{SUPABASE_API_URL}` with your Supabase project's API URL.

---

## Request Structure

### CORS Preflight Request
**Method**: `OPTIONS`  
No body or additional headers required.

### User Sign-Out Request
**Method**: `POST`  
**Headers**:
- `Authorization`: Bearer token with the user's JWT.
- `Content-Type`: `application/json`

**Body** (optional):
```json
{
  "redirect_to": "https://example.com/signed-out"
}
```

---

## Response Structure

### Success Response (With Redirect)
**Status Code**: `200`  
**Headers**:
- `Location`: URL specified in `redirect_to`

**Body**:
```json
{
  "status": "success",
  "message": "Successfully signed out, redirecting..."
}
```

### Success Response (Without Redirect)
**Status Code**: `200`  
**Body**:
```json
{
  "status": "success",
  "message": "Successfully signed out"
}
```

### Error Responses

**Status Code**: `401` (Unauthorized)  
**Body** (for missing `Authorization` header):
```json
{
  "status": "error",
  "message": "Missing Authorization header"
}
```

**Status Code**: `400` (Bad Request)  
**Body** (for Supabase Auth sign-out errors):
```json
{
  "status": "error",
  "message": "Error message from Supabase"
}
```

**Status Code**: `500` (Internal Server Error)  
**Body** (for unexpected errors):
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

```typescript name=call-auth-signOut.ts
export async function signOutUser(jwtToken, redirectTo) {
  const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/functions/v1/auth-signOut`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ redirect_to: redirectTo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to sign out user");
    }

    const data = await response.json();
    return data; // The full response from the Edge Function
  } catch (error) {
    console.error("Error signing out user:", error.message);
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
     ```

2. **Import the Function**:
   Import and use the `signOutUser` function in your Next.js components or pages.

   ```typescript name=SignOutPage.tsx
   import { useState } from "react";
   import { signOutUser } from "./call-auth-signOut";

   export default function SignOutPage() {
     const [response, setResponse] = useState(null);
     const [error, setError] = useState(null);

     async function handleSignOut() {
       const jwtToken = "JWT_TOKEN_HERE"; // Replace with the user's actual JWT token
       const redirectUrl = "https://example.com/signed-out";

       try {
         const result = await signOutUser(jwtToken, redirectUrl);
         setResponse(result);
       } catch (err) {
         setError(err.message);
       }
     }

     return (
       <div>
         <h1>Sign Out</h1>
         <button onClick={handleSignOut}>Sign Out</button>
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

   - Navigate to the Sign Out page to test the integration.

---

## Additional Notes

- Ensure your Supabase project is properly configured for authentication.
- Handle sensitive credentials securely and never expose them in client-side code.
- Optionally, implement additional security measures for validating `redirect_to` URLs.
