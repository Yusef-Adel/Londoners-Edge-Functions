# Auth Login Edge Function Documentation

This Edge Function handles user login by authenticating with Supabase Auth using provided email and password. It optionally supports redirecting the user to a specified URL after successful login.

---

## Features

- **Supabase Integration**: Authenticates users with Supabase Auth using email and password.
- **Redirect Support**: Optionally redirects users to a specified URL after successful login.
- **CORS Support**: Fully handles CORS preflight requests.
- **Error Handling**: Provides detailed error messages for input validation and authentication failures.

---

## How to Deploy

1. **Set up Supabase Edge Functions**:
   - Follow the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions) to deploy this function.
   - Ensure the environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured in your Supabase project.

2. **Environment Variables**:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase Anonymous Key.

3. **Deploy the Function**:
   - Save the code in a file named `auth-Login.ts`.
   - Deploy using the Supabase CLI:
     ```bash
     supabase functions deploy auth-Login
     ```

---

## API Endpoint

Once deployed, the function can be accessed via the following endpoint:
```
POST {SUPABASE_API_URL}/functions/v1/auth-Login
```

Replace `{SUPABASE_API_URL}` with your Supabase project's API URL.

---

## Request Structure

### CORS Preflight Request
**Method**: `OPTIONS`  
No body or additional headers required.

### User Login Request
**Method**: `POST`  
**Headers**:
- `Authorization`: Bearer token with appropriate access permissions.
- `Content-Type`: `application/json`

**Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "redirect_to": "https://example.com/dashboard"
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
  "message": "Login successful, redirecting...",
  "session": {
    "access_token": "access_token_here",
    "expires_in": 3600,
    "refresh_token": "refresh_token_here",
    "token_type": "bearer",
    "user": {
      "id": "user_id_here",
      "email": "user@example.com"
    }
  },
  "user": {
    "id": "user_id_here",
    "email": "user@example.com",
    "role": "authenticated"
  }
}
```

### Success Response (Without Redirect)
**Status Code**: `200`  
**Body**:
```json
{
  "status": "success",
  "message": "Login successful",
  "session": {
    "access_token": "access_token_here",
    "expires_in": 3600,
    "refresh_token": "refresh_token_here",
    "token_type": "bearer",
    "user": {
      "id": "user_id_here",
      "email": "user@example.com"
    }
  },
  "user": {
    "id": "user_id_here",
    "email": "user@example.com",
    "role": "authenticated"
  }
}
```

### Error Responses

**Status Code**: `400` (Bad Request)  
**Body** (for missing required fields):
```json
{
  "status": "error",
  "message": "Email and password are required"
}
```

**Status Code**: `401` (Unauthorized)  
**Body** (for invalid credentials):
```json
{
  "status": "error",
  "message": "Invalid login credentials"
}
```

**Status Code**: `500` (Internal Server Error)  
**Body** (for unexpected errors):
```json
{
  "status": "error",
  "message": "An unexpected error occurred"
}
```

---

## How to Call This Function in a Next.js Application

You can invoke this Edge Function from a Next.js application using the `fetch` API.

### Example Code

```typescript name=call-auth-Login.ts
export async function loginUser(email, password, redirectTo) {
  const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_API_URL}/functions/v1/auth-Login`;
  const token = process.env.SUPABASE_FUNCTION_TOKEN;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, redirect_to: redirectTo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to log in user");
    }

    const data = await response.json();
    return data; // The full response from the Edge Function
  } catch (error) {
    console.error("Error logging in user:", error.message);
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
   Import and use the `loginUser` function in your Next.js components or pages.

   ```typescript name=LoginPage.tsx
   import { useState } from "react";
   import { loginUser } from "./call-auth-Login";

   export default function LoginPage() {
     const [credentials, setCredentials] = useState({
       email: "",
       password: "",
       redirect_to: "https://example.com/dashboard"
     });

     const [response, setResponse] = useState(null);
     const [error, setError] = useState(null);

     async function handleLogin() {
       try {
         const result = await loginUser(credentials.email, credentials.password, credentials.redirect_to);
         setResponse(result);
       } catch (err) {
         setError(err.message);
       }
     }

     return (
       <div>
         <h1>Login</h1>
         <input
           type="email"
           placeholder="Email"
           value={credentials.email}
           onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
         />
         <input
           type="password"
           placeholder="Password"
           value={credentials.password}
           onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
         />
         <button onClick={handleLogin}>Log In</button>
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

   - Navigate to the login page to test the integration.

---

## Additional Notes

- Ensure your Supabase project is properly configured for authentication.
- Handle sensitive credentials securely and never expose them in client-side code.
- Optionally, implement additional security measures for validating `redirect_to` URLs.
