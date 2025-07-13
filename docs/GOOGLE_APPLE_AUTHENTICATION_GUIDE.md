# Google & Apple Authentication Guide

This document explains **how to enable and use Google OAuth 2.0 and Apple Sign-In** in this project for both backend and frontend parts.

---

## 1. Prerequisites

1. Node.js ≥ 18.x and npm ≥ 9.x
2. A Google Cloud-Platform (GCP) account
3. An Apple Developer account (for Apple Sign-In)
4. Access to the project's `.env` file and the ability to restart the backend server

> **File locations**
> * Backend OAuth logic lives in `src/config/passport.js`.
> * API routes are under `src/api/routes/auth.js`.
> * Frontend OAuth buttons/components are in `frontend/src/components/OAuth/`.

---

## 2. Google OAuth 2.0

### 2.1 Create OAuth 2.0 credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project → **APIs & Services ▶ OAuth consent screen**.
3. Configure the consent screen (choose *External* for most cases) and add required information.
4. Navigate to **APIs & Services ▶ Credentials ▶ Create Credentials ▶ OAuth client ID**.
5. Select **Web application** and add the following **Authorized redirect URI**:

   ```
   https://<YOUR_DOMAIN>/api/v1/auth/google/callback
   # for local development
   http://localhost:3000/api/v1/auth/google/callback
   ```

6. After creation, note the **Client ID** and **Client secret**.

### 2.2 Configure environment variables

Add the following keys to your `.env` (or to your deployment's secret manager):

```bash
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

Restart the backend so that `passport.js` picks up the new variables. If either key is missing, `passport` will log a warning and Google OAuth will be disabled.

### 2.3 Backend flow

* `GET /api/v1/auth/google` – initiates OAuth handshake (handled by `passport.authenticate('google')`).
* Google redirects the user to `/api/v1/auth/google/callback` with an authorization code.
* `passport` exchanges the code, receives profile information, then creates or links the user (see logic starting at `passport.use(new GoogleStrategy(...))`).
* On success, the route sets the session and redirects the user to the frontend (`/dashboard` by default).

### 2.4 Frontend usage

There is an `OAuthButtons` component that automatically opens `/api/v1/auth/google` in a new window. Usage example:

```jsx
import OAuthButtons from '@/components/OAuth/OAuthButtons';

function Login() {
  return (
    <div>
      <h1>Login</h1>
      <OAuthButtons providers={['google']} />
    </div>
  );
}
```

The popup will close itself when authentication succeeds and the main window will receive a `postMessage` with the user payload (see `AuthCallback.jsx`).

---

## 3. Apple Sign-In (planned)

> **Status:** Apple strategy is not in production yet. The steps below outline how to enable it.

### 3.1 Register services ID & key

1. Log in to [Apple Developer](https://developer.apple.com/account/).
2. **Certificates, Identifiers & Profiles ▶ Identifiers ▶ Service ID** and create a new *Service ID* (e.g., `com.yourcompany.web`).
3. Enable *Sign in with Apple* for that Service ID and add the following **Return URLs**:

   ```
   https://<YOUR_DOMAIN>/api/v1/auth/apple/callback
   http://localhost:3000/api/v1/auth/apple/callback
   ```
4. Go to **Keys** → plus icon → create a new key with *Sign in with Apple* enabled. Download the `.p8` file once created.
5. Note your **Team ID**, **Key ID**, and **Client ID** (Service ID).

### 3.2 Install dependencies

```bash
npm i passport-apple @types/passport-apple # if using TypeScript typings
```

### 3.3 Environment variables

```bash
APPLE_CLIENT_ID=com.yourcompany.web
APPLE_TEAM_ID=<your-team-id>
APPLE_KEY_ID=<your-key-id>
APPLE_PRIVATE_KEY="""-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQ...\n-----END PRIVATE KEY-----"""
```

Use triple quotes or `\n` placeholders to preserve newlines in the private key if you store it directly in the env file. Alternatively, mount it as a file and read from disk.

### 3.4 Add Apple Strategy (backend)

Append the following to `src/config/passport.js` **after** the Facebook strategy:

```js
const AppleStrategy = require('passport-apple');

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    callbackURL: '/api/v1/auth/apple/callback',
    scope: ['name', 'email']
  }, async (accessToken, refreshToken, idToken, profile, done) => {
    // Similar user-linking/creation logic as Google
  }));
} else {
  logger.warn('Apple Sign-In not configured – missing environment variables');
}
```

### 3.5 Routes

Add to `src/api/routes/auth.js`:

```js
router.get('/apple', passport.authenticate('apple'));
router.post('/apple/callback', passport.authenticate('apple', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));
```

*(Apple sends a POST request by default, hence `router.post`)*

### 3.6 Frontend integration

Once the backend is ready, update `OAuthButtons.jsx`:

```jsx
<OauthButtons providers={['google', 'apple']} />
```

Apple's flow opens a popup similar to Google's. No further changes are required.

---

## 4. Testing & Troubleshooting

| Issue | Solution |
|-------|----------|
| `Missing required parameter: client_id` | Ensure env variables are loaded; restart the server. |
| `redirect_uri_mismatch` (Google) | Double-check the callback URL in your Google credentials. |
| 400 `invalid_client` (Apple) | Verify Team ID, Key ID, and that the private key matches the key record. |
| Popup closes but frontend doesn't receive user | Check browser console for `postMessage` errors and verify that `window.opener` is not `null`. |

---

## 5. Security considerations

1. **HTTPS is mandatory** in production for both Google and Apple.
2. Never commit `.env` files or private keys to version control.
3. Rotate OAuth keys regularly and revoke unused credentials.
4. Monitor login activity and implement 2FA for admin accounts.

---

Happy coding! 🎉 