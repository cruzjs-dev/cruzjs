# Organization Management Test Specifications

## Overview
Tests for organization creation, member management, invitations, settings, and billing.

---

## 1. Organization Creation

### 1.1 Create Organization Form
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as authenticated user | Login succeeds |
| 2 | Navigate to create organization | Create org page/modal opens |
| 3 | Verify form fields | Name field visible |
| 4 | Verify submit button | "Create Organization" button visible |

### 1.2 Create Organization - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with empty name | Error: "Name is required" |
| 2 | Enter name with only spaces | Error: "Name is required" |
| 3 | Enter very short name (1 char) | May show minimum length error |
| 4 | Enter very long name (>100 chars) | Error or truncation |

### 1.3 Create Organization - Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter valid organization name "Test Org" | Name accepted |
| 2 | Click "Create Organization" | Loading state |
| 3 | Verify success | Organization created |
| 4 | Verify redirect | Navigate to new org dashboard |
| 5 | Verify slug generated | URL contains slug (e.g., `/orgs/test-org`) |
| 6 | Verify creator is admin | User has admin role |

### 1.4 Create Organization - Slug Generation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create org "My Test Organization" | Slug: `my-test-organization` |
| 2 | Create org "Test & Company" | Slug handles special chars |
| 3 | Create org with duplicate name | Unique slug generated (appended number) |

---

## 2. Organization Overview

### 2.1 Overview Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/overview` | Overview page loads |
| 2 | Verify organization name | Correct org name displayed |
| 3 | Verify status badge | "Active" or subscription status shown |
| 4 | Verify navigation sidebar | All org navigation items present |

### 2.2 Overview Statistics
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to overview | Page loads |
| 2 | Verify member count | Shows number of members |
| 3 | Verify cohort count | Shows number of cohorts |
| 4 | Verify lead statistics | Shows total leads, qualified leads |

### 2.3 Organization Navigation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Cohorts" in sidebar | Navigate to cohorts page |
| 2 | Click "Leads" in sidebar | Navigate to leads page |
| 3 | Click "Jobs" in sidebar | Navigate to jobs page |
| 4 | Click "Members" in sidebar | Navigate to members page |
| 5 | Click "Settings" in sidebar | Navigate to settings page |
| 6 | Click "Billing" in sidebar | Navigate to billing page |

---

## 3. Member Management

### 3.1 Members Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/members` | Members page loads |
| 2 | Verify member list | List of members displayed |
| 3 | Verify member info | Name, email, role shown for each |
| 4 | Verify invite button | "Invite Member" button visible (for admins) |

### 3.2 View Member Details
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View members list | Members shown |
| 2 | Each member shows name | Names displayed |
| 3 | Each member shows email | Emails displayed |
| 4 | Each member shows role | Role (Admin/Member/Viewer) shown |
| 5 | Each member shows join date | Date joined visible |

### 3.3 Change Member Role (Admin only)
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as org admin | Admin access |
| 2 | Navigate to members | Members page |
| 3 | Click role dropdown for a member | Role options shown |
| 4 | Change role to "Viewer" | Confirmation prompt |
| 5 | Confirm change | Success message |
| 6 | Verify role updated | New role displayed |

### 3.4 Change Member Role - Restrictions
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to change own role | Not allowed (or confirmation) |
| 2 | Try to change last admin's role | Error: "Organization must have at least one admin" |
| 3 | Non-admin tries to change roles | Role dropdown not visible/disabled |

### 3.5 Remove Member (Admin only)
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as org admin | Admin access |
| 2 | Click remove button for member | Confirmation modal |
| 3 | Confirm removal | Loading state |
| 4 | Verify success | Member removed from list |
| 5 | Verify member access revoked | Removed member can't access org |

### 3.6 Remove Member - Restrictions
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to remove self | Not allowed (or leave org flow) |
| 2 | Try to remove last admin | Error message |
| 3 | Non-admin tries to remove | Remove button not visible |

---

## 4. Invitations

### 4.1 Invitations Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/invitations` | Invitations page loads |
| 2 | Verify pending invitations list | List of pending invites shown |
| 3 | Verify invite button | "Send Invitation" button visible |

### 4.2 Send Invitation
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Send Invitation" | Invitation form/modal opens |
| 2 | Enter valid email | Email accepted |
| 3 | Select role (Member) | Role selected |
| 4 | Click send | Loading state |
| 5 | Verify success | Success: "Invitation sent" |
| 6 | Verify in pending list | New invitation appears |
| 7 | Check invitee email | Invitation email received |

### 4.3 Send Invitation - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with empty email | Email required error |
| 2 | Submit with invalid email | Invalid email format error |
| 3 | Invite existing member | Error: "User is already a member" |
| 4 | Invite email with pending invite | Error: "Invitation already pending" |

### 4.4 Cancel Invitation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View pending invitations | Invitations listed |
| 2 | Click cancel/revoke on invitation | Confirmation prompt |
| 3 | Confirm cancellation | Invitation removed |
| 4 | Verify invitation link invalid | Accepting link shows error |

### 4.5 Resend Invitation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View pending invitations | Invitations listed |
| 2 | Click resend on invitation | Loading state |
| 3 | Verify success | "Invitation resent" message |
| 4 | Check invitee email | New invitation email received |

### 4.6 Accept Invitation - New User
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send invitation to new email | Invitation sent |
| 2 | Open invitation link (logged out) | Accept invitation page |
| 3 | Prompted to register | Registration form shown |
| 4 | Complete registration | Account created |
| 5 | Verify org membership | User added to organization |
| 6 | Verify correct role | User has invited role |

### 4.7 Accept Invitation - Existing User
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send invitation to existing user email | Invitation sent |
| 2 | Existing user opens link | Accept invitation page |
| 3 | If logged in | Directly prompted to accept |
| 4 | If logged out | Prompted to login |
| 5 | Accept invitation | Added to organization |
| 6 | Verify org appears in user's orgs | New org accessible |

### 4.8 Invitation Expiration
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send invitation | Invitation created |
| 2 | Wait for expiration period | Invitation expires |
| 3 | Try to accept expired invitation | Error: "Invitation has expired" |
| 4 | Verify option to request new | "Request new invitation" shown |

---

## 5. Organization Settings

### 5.1 Settings Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/settings` | Settings page loads |
| 2 | Verify org name editable | Name field with current value |
| 3 | Verify save button | "Save Changes" button visible |

### 5.2 Update Organization Name
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change organization name | New name entered |
| 2 | Click save | Loading state |
| 3 | Verify success | Success message |
| 4 | Verify name updated | New name shown in sidebar |
| 5 | Note: slug may or may not change | Depends on implementation |

### 5.3 Update Organization Name - Validation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear name field | Empty |
| 2 | Click save | Error: "Name is required" |
| 3 | Enter very long name | Error or truncation |

### 5.4 Settings Access Control
**Priority**: High
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as org admin | Can access settings |
| 2 | Login as org member | Settings may be read-only or hidden |
| 3 | Login as org viewer | Settings not accessible |

---

## 6. Billing

### 6.1 Billing Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/billing` | Billing page loads |
| 2 | Verify current plan | Plan name and status shown |
| 3 | Verify billing info | Payment method info (if any) |

### 6.2 View Subscription Status
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to billing | Page loads |
| 2 | Verify plan tier | Current plan displayed |
| 3 | Verify billing cycle | Monthly/Annual shown |
| 4 | Verify next billing date | Date displayed |
| 5 | Verify usage stats | Credits/limits shown |

### 6.3 Upgrade/Downgrade Plan (if applicable)
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click upgrade/change plan | Plan options shown |
| 2 | Select new plan | Plan selected |
| 3 | Proceed to payment | Payment flow initiated |
| 4 | Complete payment | Plan upgraded |
| 5 | Verify new plan active | New plan shown |

### 6.4 Update Payment Method
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click update payment | Payment form opens |
| 2 | Enter new card details | Details accepted |
| 3 | Save changes | Loading state |
| 4 | Verify success | New payment method shown |

### 6.5 View Billing History
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to billing history | Invoice list shown |
| 2 | Verify invoice details | Date, amount, status |
| 3 | Download invoice | PDF downloaded |

### 6.6 Cancel Subscription
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click cancel subscription | Confirmation modal |
| 2 | Modal shows end date | "Access until X date" |
| 3 | Confirm cancellation | Subscription cancelled |
| 4 | Verify status | "Canceling" or "Cancelled" shown |

---

## 7. Organization Switching

### 7.1 Switch Between Organizations
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User has multiple orgs | Multiple orgs available |
| 2 | Click org switcher in header | Org list shown |
| 3 | Select different org | Loading/navigation |
| 4 | Verify context switch | New org name in sidebar |
| 5 | Verify URL updated | URL reflects new org slug |

### 7.2 Create New Organization from Switcher
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click org switcher | Dropdown opens |
| 2 | Click "Create Organization" | Create flow initiated |
| 3 | Complete creation | New org created |
| 4 | Verify in org list | New org appears in switcher |

---

## 8. Leave Organization

### 8.1 Leave Organization Flow
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to org settings or members | Page loads |
| 2 | Find "Leave Organization" option | Option visible |
| 3 | Click leave | Confirmation modal |
| 4 | Confirm leaving | Processing |
| 5 | Verify removal | Redirected away from org |
| 6 | Verify org not in list | Org removed from user's orgs |

### 8.2 Leave Organization - Last Admin
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User is only admin | Admin role |
| 2 | Try to leave organization | Error shown |
| 3 | Error message | "Transfer admin role first" or "Cannot leave" |

---

## 9. Delete Organization

### 9.1 Delete Organization (Owner/Admin only)
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to org settings | Settings page |
| 2 | Find "Delete Organization" | Option visible (danger zone) |
| 3 | Click delete | Confirmation modal |
| 4 | Modal requires confirmation | Type org name to confirm |
| 5 | Confirm deletion | Processing |
| 6 | Verify org deleted | Redirected to dashboard |
| 7 | Verify org inaccessible | 404 when visiting old URL |

### 9.2 Delete Organization - Data Cleanup
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Delete organization with data | Org deleted |
| 2 | Verify cohorts deleted | No orphaned cohorts |
| 3 | Verify leads deleted | No orphaned leads |
| 4 | Verify sources deleted | No orphaned sources |
| 5 | Verify members removed | Members don't see org |

---

## Role-Based Access Summary

| Feature | Admin | Member | Viewer |
|---------|-------|--------|--------|
| View org overview | Yes | Yes | Yes |
| View members | Yes | Yes | Yes |
| Invite members | Yes | No | No |
| Remove members | Yes | No | No |
| Change roles | Yes | No | No |
| Edit settings | Yes | No | No |
| View billing | Yes | Limited | No |
| Manage billing | Yes | No | No |
| Delete org | Yes | No | No |
| Leave org | Yes | Yes | Yes |

---

## Test Data Requirements

### Test Organization
- Name: Zipper
- Slug: zipper
- Status: Active
- At least 2 members

### Test Users
- Admin: `kerry@joinzipper.com` / `Temp123!`
- Member: Create or use existing member account
- Viewer: Create or use existing viewer account

### Invitation Testing
- Access to email inbox for invitation acceptance
- Multiple unique email addresses for testing
