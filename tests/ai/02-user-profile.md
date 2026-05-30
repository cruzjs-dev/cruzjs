# User Profile Test Specifications

## Overview
Tests for user profile management including viewing profile, updating information, changing password, and managing settings.

---

## 1. Profile Page Display

### 1.1 Profile Page Access
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as `kerry@joinzipper.com` | Login succeeds |
| 2 | Navigate to `/profile` | Profile page loads |
| 3 | Verify page title | "Profile" or user name displayed |
| 4 | Verify user info visible | Name and email shown |

### 1.2 Profile Information Display
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to profile page | Page loads |
| 2 | Verify name displayed | Current user name shown |
| 3 | Verify email displayed | User email shown (possibly masked) |
| 4 | Verify avatar | User avatar or default avatar shown |
| 5 | Verify edit options | Edit buttons/links available |

### 1.3 Profile Navigation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click user menu in header | Dropdown opens |
| 2 | Click "Profile" option | Navigate to `/profile` |
| 3 | Verify breadcrumb/back nav | Can return to previous page |

---

## 2. Update Profile Information

### 2.1 Edit Name
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to profile page | Page loads |
| 2 | Click edit name button/field | Name becomes editable |
| 3 | Clear name field | Field is empty |
| 4 | Enter new name "Test User Updated" | Name field updated |
| 5 | Click save/confirm | Loading state shown |
| 6 | Verify success | Success message: "Profile updated" |
| 7 | Refresh page | New name persists |

### 2.2 Edit Name - Validation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to save empty name | Error: "Name is required" |
| 2 | Enter name with only spaces | Error: "Name is required" |
| 3 | Enter very long name (>100 chars) | Error or truncation |
| 4 | Enter name with special characters | Accepted (names can have accents, etc.) |

### 2.3 Update Avatar
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click avatar or change avatar button | File picker opens |
| 2 | Select valid image file (JPG/PNG) | Image preview shown |
| 3 | Confirm upload | Loading state |
| 4 | Verify success | New avatar displayed |
| 5 | Refresh page | Avatar persists |

### 2.4 Update Avatar - Validation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to upload non-image file | Error: "Invalid file type" |
| 2 | Try to upload oversized image (>5MB) | Error: "File too large" |
| 3 | Upload very small image | Image accepted and scaled |
| 4 | Upload image with wrong aspect ratio | Image cropped or accepted |

### 2.5 Cancel Edit
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start editing name | Edit mode active |
| 2 | Make changes | Changes visible |
| 3 | Click cancel | Edit mode closes |
| 4 | Verify original values | Original name restored |

---

## 3. Change Password

### 3.1 Change Password Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to profile settings | Settings page loads |
| 2 | Find password section | "Change Password" section visible |
| 3 | Verify form fields | Current password, new password, confirm password |
| 4 | Verify submit button | "Change Password" button visible |

### 3.2 Change Password - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with all empty fields | All fields required errors |
| 2 | Enter only current password | New password required error |
| 3 | Enter current and new, no confirm | Confirm password required |
| 4 | Enter mismatched new passwords | Passwords don't match error |
| 5 | Enter weak new password | Password strength error |

### 3.3 Change Password - Wrong Current Password
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter wrong current password | Error shown |
| 2 | Enter correct new passwords | Fields valid |
| 3 | Submit form | Error: "Current password is incorrect" |
| 4 | Verify password unchanged | Can still login with old password |

### 3.4 Change Password - Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter correct current password | Field accepted |
| 2 | Enter valid new password | Field accepted |
| 3 | Confirm new password | Passwords match |
| 4 | Click "Change Password" | Loading state |
| 5 | Verify success | Success: "Password changed successfully" |
| 6 | Logout | Session ends |
| 7 | Login with new password | Login succeeds |
| 8 | Verify old password invalid | Login with old password fails |

### 3.5 Change Password - Same as Current
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter current password | Field accepted |
| 2 | Enter same password as new | May show warning |
| 3 | Submit | Either accepted or "Must be different" error |

---

## 4. Profile Settings

### 4.1 Settings Page Access
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile/settings` | Settings page loads |
| 2 | Verify settings sections | Various settings categories visible |
| 3 | Verify navigation | Can return to main profile |

### 4.2 Email Preferences (if applicable)
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find email preferences section | Section visible |
| 2 | Toggle marketing emails off | Toggle updates |
| 3 | Save preferences | Success message |
| 4 | Refresh page | Preference persists |

### 4.3 Notification Settings (if applicable)
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find notification settings | Section visible |
| 2 | Toggle specific notification types | Toggles update |
| 3 | Save settings | Success message |
| 4 | Verify settings persist | Refresh shows saved state |

---

## 5. Feature Onboarding Tracking

### 5.1 Check Onboarding Status
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as user who hasn't completed onboarding | Login succeeds |
| 2 | Navigate to pipeline feature | Onboarding wizard may appear |
| 3 | Check `featureOnboarding` in profile data | Status reflects completion state |

### 5.2 Complete Feature Onboarding
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger onboarding for "intro" feature | Onboarding wizard opens |
| 2 | Complete all onboarding steps | Progress through wizard |
| 3 | Verify completion tracked | `featureOnboarding.intro` timestamp set |
| 4 | Navigate away and return | Onboarding doesn't show again |

### 5.3 Onboarding - Multiple Features
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete "intro" onboarding | Intro marked complete |
| 2 | Access new feature with onboarding | New feature onboarding shows |
| 3 | Complete new feature onboarding | Both features marked complete |
| 4 | Verify independent tracking | Each feature tracked separately |

---

## 6. Current Organization

### 6.1 Set Current Organization
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User has multiple organizations | Multiple orgs available |
| 2 | Switch to organization A | Current org set to A |
| 3 | Navigate to org-specific pages | Context is organization A |
| 4 | Switch to organization B | Current org changes |
| 5 | Verify context change | Pages show org B data |

### 6.2 Current Organization Persistence
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set current organization | Org selected |
| 2 | Logout | Session ends |
| 3 | Login again | Current org preference persists (or reset) |

---

## 7. Account Security

### 7.1 View Active Sessions (if applicable)
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to security settings | Security page loads |
| 2 | View active sessions | List of sessions shown |
| 3 | Verify current session marked | Current session identified |

### 7.2 Revoke Other Sessions (if applicable)
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login from two browsers | Two sessions active |
| 2 | View sessions in Browser A | Both sessions shown |
| 3 | Revoke Browser B session | Session removed |
| 4 | Verify Browser B logged out | Browser B redirected to login |

---

## 8. Delete Account (if applicable)

### 8.1 Delete Account Option
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to account settings | Settings page loads |
| 2 | Find delete account option | "Delete Account" button visible |
| 3 | Verify warning | Clear warning about data deletion |

### 8.2 Delete Account - Confirmation
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete account | Confirmation modal opens |
| 2 | Modal requires typing confirmation | "DELETE" or email required |
| 3 | Cancel deletion | Modal closes, no changes |
| 4 | Confirm deletion | Account deleted |
| 5 | Verify logout | User logged out |
| 6 | Try to login | Account not found |

---

## API Endpoints to Test

### tRPC Procedures
- `userProfile.current` - Get current user profile
- `userProfile.get` - Get user by ID
- `userProfile.update` - Update name and avatar
- `userProfile.changePassword` - Change password
- `userProfile.getFeatureOnboarding` - Get onboarding status
- `userProfile.completeFeatureOnboarding` - Mark feature complete
- `userProfile.setCurrentOrg` - Set current organization

---

## Test Data Requirements

### Existing User
- Email: `kerry@joinzipper.com`
- Password: `Temp123!`
- Has profile data

### Test Images
- Valid avatar image (JPG, <2MB)
- Invalid file (PDF, non-image)
- Oversized image (>5MB)

### Multiple Organizations
- User belongs to at least 2 organizations for org switching tests
