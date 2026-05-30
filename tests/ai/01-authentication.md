# Authentication Test Specifications

## Overview
Tests for user authentication flows including registration, login, password management, and email verification.

---

## 1. User Registration

### 1.1 Registration Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/register` | Registration page loads |
| 2 | Verify form fields present | Name, email, password, confirm password fields visible |
| 3 | Verify terms checkbox | "I accept the terms" checkbox is present |
| 4 | Verify submit button | "Create Account" button is visible |
| 5 | Verify login link | "Already have an account? Log in" link is present |

### 1.2 Registration Validation - Required Fields
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click submit with empty form | Error messages appear for all required fields |
| 2 | Enter only name, submit | Email and password errors shown |
| 3 | Enter name and email, submit | Password error shown |
| 4 | Enter all except terms checkbox | "You must accept terms" error shown |

### 1.3 Registration Validation - Email Format
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter "invalid-email" in email field | Invalid email format error |
| 2 | Enter "test@" in email field | Invalid email format error |
| 3 | Enter "test@domain" in email field | Invalid email format error |
| 4 | Enter "test@domain.com" | No email format error |

### 1.4 Registration Validation - Password Requirements
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter password "123" | Password too short error (minimum 8 characters) |
| 2 | Enter password "password" | Weak password warning (no numbers/special chars) |
| 3 | Enter mismatched confirm password | Passwords do not match error |
| 4 | Enter matching strong passwords | No password errors |

### 1.5 Registration Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill valid registration form with unique email | Form accepts input |
| 2 | Check terms checkbox | Checkbox is checked |
| 3 | Click "Create Account" | Loading state shown |
| 4 | Wait for response | Success message: "Check your email to verify" |
| 5 | Check email inbox | Verification email received |
| 6 | Verify email contains link | Link to `/auth/verify-email/:token` |

### 1.6 Registration - Duplicate Email
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Register with email "existing@test.com" | Registration succeeds |
| 2 | Try registering again with same email | Error: "Email already registered" |

---

## 2. User Login

### 2.1 Login Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/login` | Login page loads |
| 2 | Verify form fields | Email and password fields visible |
| 3 | Verify submit button | "Sign In" button visible |
| 4 | Verify forgot password link | "Forgot password?" link present |
| 5 | Verify register link | "Don't have an account? Register" link present |

### 2.2 Login Validation - Required Fields
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click submit with empty form | Email and password required errors |
| 2 | Enter only email, submit | Password required error |
| 3 | Enter only password, submit | Email required error |

### 2.3 Login - Invalid Credentials
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter non-existent email | Error: "Invalid email or password" |
| 2 | Enter valid email, wrong password | Error: "Invalid email or password" |
| 3 | Verify error is generic | No indication of which field is wrong |

### 2.4 Login Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter valid email: `kerry@joinzipper.com` | Email accepted |
| 2 | Enter valid password: `Temp123!` | Password accepted |
| 3 | Click "Sign In" | Loading state shown |
| 4 | Wait for response | Redirect to dashboard |
| 5 | Verify session | User menu shows logged in state |

### 2.5 Login - Unverified Email
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with unverified email account | Error: "Please verify your email first" |
| 2 | Verify resend option | "Resend verification email" option shown |

### 2.6 Login - Remember Me (if applicable)
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login without "Remember me" | Session expires on browser close |
| 2 | Login with "Remember me" checked | Session persists after browser restart |

---

## 3. Password Reset

### 3.1 Forgot Password Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/forgot-password` | Forgot password page loads |
| 2 | Verify email field | Email input field visible |
| 3 | Verify submit button | "Send Reset Link" button visible |
| 4 | Verify back to login link | Link to return to login page |

### 3.2 Forgot Password - Email Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit empty form | Email required error |
| 2 | Submit invalid email format | Invalid email error |
| 3 | Submit non-existent email | Success message (no email sent, security) |
| 4 | Submit valid registered email | Success message shown |

### 3.3 Forgot Password - Email Sent
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit valid registered email | Success: "Check your email for reset link" |
| 2 | Check email inbox | Reset email received |
| 3 | Verify email content | Contains link to `/auth/reset-password/:token` |
| 4 | Verify token expiration info | Email mentions link expires in X hours |

### 3.4 Reset Password Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click reset link from email | Reset password page loads |
| 2 | Verify form fields | New password, confirm password fields visible |
| 3 | Verify submit button | "Reset Password" button visible |

### 3.5 Reset Password - Invalid Token
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/reset-password/invalid-token` | Error: "Invalid or expired reset link" |
| 2 | Navigate with expired token | Error: "Reset link has expired" |
| 3 | Verify request new link option | "Request a new reset link" button shown |

### 3.6 Reset Password - Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open valid reset link | Reset form displays |
| 2 | Enter new password | Password field accepts input |
| 3 | Confirm new password | Passwords match |
| 4 | Click "Reset Password" | Loading state |
| 5 | Wait for response | Success: "Password reset successfully" |
| 6 | Verify redirect | Redirect to login page |
| 7 | Login with new password | Login succeeds |

### 3.7 Reset Password - Token Single Use
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Successfully reset password with token | Password changed |
| 2 | Try to use same token again | Error: "Reset link already used" |

---

## 4. Email Verification

### 4.1 Verification Link - Valid Token
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Register new account | Verification email sent |
| 2 | Click verification link | Verification page loads |
| 3 | Wait for verification | Success: "Email verified successfully" |
| 4 | Verify redirect | Redirect to login page |
| 5 | Login with verified account | Login succeeds |

### 4.2 Verification Link - Invalid Token
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/verify-email/invalid-token` | Error: "Invalid verification link" |
| 2 | Navigate with expired token | Error: "Verification link expired" |
| 3 | Verify resend option | "Resend verification email" button shown |

### 4.3 Resend Verification Email
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Resend verification email" | Loading state |
| 2 | Wait for response | Success: "Verification email sent" |
| 3 | Check email inbox | New verification email received |
| 4 | Verify old token invalid | Old verification link no longer works |

---

## 5. Session Management

### 5.1 Session Persistence
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login successfully | Session created |
| 2 | Refresh page | User remains logged in |
| 3 | Open new tab | User logged in on new tab |

### 5.2 Logout
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click user menu | Menu opens |
| 2 | Click "Sign Out" | Logout initiated |
| 3 | Verify redirect | Redirect to login page |
| 4 | Try accessing protected route | Redirect to login |

### 5.3 Session Expiration
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and wait for session timeout | Session expires |
| 2 | Try to access protected route | Redirect to login with message |
| 3 | Verify message | "Session expired, please login again" |

### 5.4 Concurrent Sessions
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login in Browser A | Session created |
| 2 | Login in Browser B | New session created |
| 3 | Verify Browser A session | Still valid (or invalidated per policy) |

---

## 6. Protected Routes

### 6.1 Unauthenticated Access to Protected Routes
**Priority**: Critical
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard` without login | Redirect to login |
| 2 | Navigate to `/profile` without login | Redirect to login |
| 3 | Navigate to `/orgs/zipper/cohorts` without login | Redirect to login |
| 4 | Verify return URL | After login, redirect to originally requested page |

### 6.2 API Protection
**Priority**: Critical
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call tRPC endpoint without session | 401 Unauthorized |
| 2 | Call tRPC endpoint with expired session | 401 Unauthorized |
| 3 | Call tRPC endpoint with valid session | Request succeeds |

---

## Test Data Requirements

### New User Registration
- Unique email for each test run (use timestamp: `test+{timestamp}@example.com`)
- Valid password meeting requirements

### Existing User Login
- Email: `kerry@joinzipper.com`
- Password: `Temp123!`

### Password Reset
- Account with known email for reset testing
- Access to email inbox (or mock email service)
