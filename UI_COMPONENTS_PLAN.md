# UI Component Library Plan

Cross-reference of unique components across Chakra UI, Chakra UI Pro, Ionic Framework, MUI Joy UI, and Mantine.

**Sources:**
- **Chakra** — [chakra-ui.com](https://www.chakra-ui.com/docs/components/concepts/overview)
- **Chakra Pro** — [pro.chakra-ui.com](https://pro.chakra-ui.com/explore) (block-level app UI)
- **Ionic** — [ionicframework.com/docs/components](https://ionicframework.com/docs/components)
- **Joy UI** — [v7.mui.com/joy-ui](https://v7.mui.com/joy-ui/getting-started/)
- **Mantine** — [mantine.dev](https://mantine.dev) + [ui.mantine.dev](https://ui.mantine.dev)

Legend: **C** = Chakra, **CP** = Chakra Pro, **I** = Ionic, **J** = Joy UI, **M** = Mantine

---

## Layout & Structure

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Box** | C, J, M | Base primitive; all HTML props, polymorphic `as` |
| **Flex** | C, M | Flexbox container with gap/direction/wrap shortcuts |
| **Grid** | C, J, M, I | CSS grid; J uses `offset`; M has fractional columns |
| **Stack** | C, J, M | Vertical/horizontal child spacing; nested variants |
| **SimpleGrid** | C, M | Responsive column count without explicit column sizes |
| **Container** | C, M | Max-width centered wrapper with responsive padding |
| **Center** | C, M | Centers children horizontally and vertically |
| **Group** | C, M | Inline row of items with gap; M supports `preventGrowOverflow` |
| **Wrap** | C | Flex wrap with alignment; auto-wraps overflow children |
| **Splitter** | C | Resizable split panes (horizontal or vertical) |
| **Bleed** | C | Negative-margin escape from Container padding |
| **Float** | C | Float children to corners/edges of relative parent |
| **Scroll Area** | C, M | Custom-styled scrollbar within a bounded region |
| **Separator / Divider** | C, J, M | Horizontal or vertical line; orientation + thickness props |
| **Aspect Ratio** | C, J, M | Enforce w/h ratio on media or arbitrary content |
| **Space** | M | Adds explicit spacing between elements |
| **AppShell** | M | Full app layout: navbar + header + aside + main + footer regions |
| **Paper** | M | Elevated surface with rounded corners and shadow levels |
| **Content** | I | Main page scrollable content area |
| **Header / Footer / Toolbar** | I | App chrome regions; sticky/fixed variants |

---

## Typography

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Heading / Title** | C, J, M | Semantic h1–h6; scale-based sizing |
| **Text / Typography** | C, J, M | Paragraph/span text; responsive size + truncation |
| **Link / Anchor** | C, J, M | Accessible anchor; external/router variants |
| **Blockquote** | C, M | Styled `<blockquote>` with optional cite |
| **Code** | C, M | Inline `<code>` with syntax-highlighted option |
| **Code Block** | C | Multi-line syntax-highlighted block with copy |
| **Highlight** | C, M | Wraps text substring with background highlight |
| **Kbd** | C, J, M | Keyboard shortcut key styling |
| **Mark** | C, M | Inline text `<mark>` highlight |
| **Em** | C | Italic emphasis wrapper |
| **List** | C, J, M | `<ul>/<ol>` with styled items; nested support |
| **Prose** | C | Applies typographic styles to arbitrary HTML/markdown |
| **Rich Text Editor** | C | Full WYSIWYG editor component |
| **NumberFormatter** | M | Locale-aware number formatting with prefix/suffix |
| **RollingNumber** | M | Animated digit roller for changing numbers |

---

## Buttons

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Button** | C, I, J, M | Variants (solid/outline/ghost/plain); sizes; loading state; left/right icon slots |
| **Icon Button** | C, M (ActionIcon) | Square button for icon-only actions; all button variants |
| **Close Button** | C, M | Pre-built ✕ dismiss button; accessible label |
| **Button Group** | C, J, M | Fused/spaced group; attached borders between items |
| **Toggle Button Group** | J | Exclusive or multi-select button set (like tabs but inline) |
| **File Button** | M | Invisible file input bound to any trigger element |
| **Copy Button** | M | Clipboard copy with auto-reset "copied" feedback |
| **Unstyled Button** | M | Bare interactive element; zero default styles |
| **Floating Action Button (FAB)** | I | Circular raised button; fixed screen position |

---

## Forms & Inputs

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Input** | C, I, J, M | Text input; variants + sizes; left/right decorators |
| **Textarea** | C, I, J, M | Multi-line text; autosize/max-rows; resize control |
| **Checkbox** | C, I, J, M | Indeterminate state; checkbox group; custom icon |
| **Radio** | C, I, J, M | Radio group; horizontal/vertical layout |
| **Switch / Toggle** | C, I, J, M | Boolean toggle; animated thumb |
| **Select / Native Select** | C, I, J, M | Dropdown selection; controlled + uncontrolled |
| **Combobox / Autocomplete** | C, J, M | Free-solo; async options; multi-select; groupBy; filter |
| **MultiSelect** | M | Chips-in-field multi-option select |
| **Tags Input / Pills Input** | C, M | Type-and-add tag list; creatable; duplicate prevention |
| **TreeSelect** | M | Hierarchical option tree within select |
| **Searchbar** | I | Mobile-style search input with clear and cancel |
| **Slider** | C, I, J, M | Single-value range slider; step; marks; tooltip |
| **Range Slider** | C (Slider), I (Range), M | Two-handle min/max range selection |
| **Angle Slider** | M | Circular 0–360° degree picker |
| **Hue Slider** | M | Horizontal hue bar for color picking |
| **Alpha Slider** | M | Transparency channel slider |
| **Color Picker** | C, M | Saturation/value canvas + hue + alpha |
| **Color Input** | M | Text input + popover color picker combined |
| **Date Picker** | C, I | Calendar popover bound to text input |
| **Calendar** | C | Standalone month/date grid; range selection |
| **Time Picker** | I | Native/custom time selection |
| **Number Input** | C, M | Increment/decrement stepper; min/max/step; precision |
| **Password Input** | C, M | Show/hide toggle; strength meter variant |
| **Pin Input** | C, M | OTP / verification code; auto-advance; mask option |
| **File Upload / File Input** | C, M | Drag-and-drop zone; MIME filter; multiple files |
| **Segment / Segmented Control** | I, M | Inline multi-option picker (like tabs for inputs) |
| **Rating** | M | 1–N star (or custom icon) rating selector; half-star |
| **JSON Input** | M | Textarea with JSON syntax validation |
| **Mask Input** | M | Phone/date/custom character-mask formatting |
| **Fieldset** | M | Grouped form fields with legend; disabled propagation |
| **Text Field** | J | Input + label + helper text + error in one compound |

---

## Data Display

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Avatar** | C, I, J, M | Image/initials/fallback; group with overlap; badge overlay |
| **Badge** | C, I, J, M | Count indicator; dot variant; positioned overlay |
| **Card** | C, I, J, M | Surface container; header/body/footer sections |
| **Table** | C, J, M | Sortable, striped, bordered; sticky header; responsive |
| **List / Item** | C, I, J, M | Styled item rows; icons; secondary text; dividers |
| **Stat** | C, M | Metric display; value + label + delta with trend arrow |
| **Timeline** | C, M | Vertical event sequence; custom icons; alternating layout |
| **Image** | C, I, M | Lazy load; fallback; aspect ratio; object-fit control |
| **Icon** | C, I | SVG icon wrapper; size + color from theme |
| **Thumbnail** | I | Small fixed-size image preview |
| **Chip** | I, J, M | Compact tag/badge with optional remove action |
| **QR Code** | C | Renders a QR code SVG from a string value |
| **Marquee** | C, M | Auto-scrolling horizontal ticker |
| **Color Swatch** | M | Small color preview dot/square |
| **Background Image** | M | `div` with `background-image`; covers/contains |
| **Indicator** | M | Small dot/badge pinned to corner of any element |
| **ThemeIcon** | M | Icon wrapped in colored circle/square background |
| **Spoiler** | M | Truncates long content with "show more" expand |
| **Overflow List** | M | Shows N items, collapses rest into "+X more" |
| **Kbd** | C, J, M | Keyboard key display |

---

## Overlays & Modals

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Modal / Dialog** | C, I, J, M | Blocking overlay; focus trap; close-on-backdrop |
| **Drawer** | C, I, J, M | Slides in from edge; top/bottom/left/right |
| **Popover** | C, I, J, M | Anchored floating box; arrow pointer; click or hover trigger |
| **Tooltip** | C, I, J, M | Hover info; placement; delay; arrow |
| **Hover Card** | C, M | Rich preview on hover; delayed open/close |
| **Toast / Snackbar** | C, J | Self-dismissing notification; position; status variants |
| **Notification** | M | Persistent or timed alert pushed to a stack |
| **Alert** | C, I, J, M | Inline status message; title + description; dismissible |
| **Action Sheet** | I | Native-style bottom sheet of action buttons |
| **Menu** | C, I, J, M | Dropdown list of actions; nested submenus; checked items |
| **Action Bar** | C | Floating toolbar that appears on row selection |
| **Overlay** | M | Full-area darkening layer; `fixed` or within parent |
| **Loading Overlay** | M | Overlay + centered spinner for async operations |
| **Floating Indicator** | M | Animated highlight that tracks active tab/button |
| **Floating Window** | M | Draggable, resizable floating panel |
| **Affix** | M | Sticks child to viewport edge; top/bottom/left/right offset |
| **Dialog (small)** | M | Non-modal compact action dialog (not full-screen) |

---

## Navigation & Routing

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Tabs** | C, I, J, M | Horizontal/vertical; lazy-load panels; controlled |
| **Accordion** | C, J, M | Expand/collapse panels; single or multi open |
| **Breadcrumbs** | C, I, J, M | Path trail; custom separator; overflow ellipsis |
| **Steps / Stepper** | C, J, M | Multi-step wizard; vertical/horizontal; clickable steps |
| **Pagination** | M | Page number controls; `<`, `>`, first/last; size variants |
| **NavLink** | M | Router-aware nav item; nested; active state |
| **Tabs** | I | Bottom/top bar tabs; icon + label; scroll overflow |
| **Burger** | M | Animated hamburger → X toggle for sidebar open/close |
| **Tree** | M | Hierarchical expand/collapse node tree |
| **Table of Contents** | M | Scrollspy-linked heading list for long pages |
| **Back Button** | I | Platform-aware navigation back button |
| **Collapsible / Collapse** | C, M | Toggle any content block open/closed with animation |
| **Carousel** | C, M | Scrollable slides; autoplay; dots; arrow nav |

---

## Feedback & Loading

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Spinner / Loader** | C, I, J, M | Indeterminate spin animation; size + color |
| **Skeleton** | C, I, J, M | Placeholder shimmer matching expected content shape |
| **Progress (linear)** | C, I, J, M | Horizontal bar; determinate + indeterminate; striped |
| **Progress (circular)** | C, J, M | Ring progress; percentage label inside |
| **Ring Progress** | M | Multi-section colored ring; section tooltips |
| **Semi-Circle Progress** | M | Half-circle gauge meter |
| **Empty State** | C | Illustrated zero-state with title, description, CTA |
| **Status** | C | Colored dot indicator (online/offline/busy/away) |
| **Refresher** | I | Pull-to-refresh gesture handler |
| **Infinite Scroll** | I | Trigger callback when user nears list bottom |
| **Reorder** | I | Drag-to-reorder list items |

---

## Utilities

| Component | Libraries | Features / Notes |
|-----------|-----------|-----------------|
| **Portal** | C, M | Renders children into a different DOM node |
| **Focus Trap** | M | Constrains Tab key within a region |
| **Transition** | M | CSS-keyframe enter/exit animations on mount/unmount |
| **Visually Hidden** | M | Accessible hidden element; visible to screen readers |
| **Collapse** | C, M | Animated height expand/collapse wrapper |
| **Presence** | C | Deferred unmount until exit animation completes |
| **Show** | C | Conditional render based on breakpoint |
| **For** | C | List rendering utility with key management |
| **Client Only** | C | Prevents SSR render; useful for browser-only components |
| **Theme** | C | Inline theme override scope |
| **CSS Baseline** | J | Global CSS reset/normalize |
| **Scroller** | M | Virtual scroll container for large lists |
| **Drag-and-Drop** | M (ui.mantine.dev) | Reorderable list/grid blocks |

---

## Chakra UI Pro — Block-Level Components

These are pre-composed app sections (not atomic components). Each exists in multiple layout/style variants.

### Authentication
| Block | Description |
|-------|-------------|
| Login form | Email+password; social OAuth buttons; "remember me" |
| Register form | Name/email/password; terms checkbox |
| OTP / 2FA form | PIN input step with resend timer |
| Social login | Provider button grid (Google, GitHub, etc.) |
| Web3 auth | Wallet connect flow |
| Workspace login | Org-scoped login with logo |
| Forgot / Reset password | Email request + new password forms |

### Navigation
| Block | Description |
|-------|-------------|
| Navbar | Horizontal top nav; search; user menu; notifications |
| Sidebar | Vertical nav; collapsible groups; icon-only collapsed state |
| Multi-level nav | Nested item trees; flyout submenus |

### Settings Pages
| Block | Description |
|-------|-------------|
| Profile settings | Avatar upload; name/email/bio fields |
| Notification preferences | Per-channel toggles |
| API key management | Create/revoke keys; copy-to-clipboard |
| Billing & plan | Current plan card; upgrade CTA |
| Accessibility | Font size, contrast, motion controls |
| Team / role management | Member list; role assignment dropdowns |
| Audit log | Timestamped event table with filters |
| Authentication settings | MFA toggle; session management |

### Data & Content
| Block | Description |
|-------|-------------|
| Analytics charts | Line/bar/area charts for dashboards |
| Stats grid | KPI cards with trend indicators |
| Data table | Sort/filter/paginate; row actions |
| Feed | Activity/comment stream; upvote; reply |
| Blog cards | Article preview with author/date/tag |
| Project cards | Status badge; progress; assignee avatars |
| Pricing cards | Plan tiers; feature checklist; CTA |
| E-commerce product cards | Image; price; cart button; rating |

### App Management
| Block | Description |
|-------|-------------|
| Webhook management | Create form; event log table; test tool |
| Organization switcher | Dropdown of orgs with avatar + create CTA |
| Onboarding checklist | Step-by-step task list with progress |
| Onboarding (image/video) | Visual onboarding sequence slides |
| Sharing dialog | Invite by email; link copy; permission select |
| Property panel | Sidebar form for editing selected item properties |
| AI prompt interface | Chat-style input; response streaming display |
| Code playground | Live editor + preview pane |

### User & Profile
| Block | Description |
|-------|-------------|
| Profile cards (×8) | Variants: compact, detailed, social stats, team roster |
| User menu | Popover with avatar + links + logout |
| Notification tray | Badge-triggered list; mark-read; filter tabs |

---

## Unique / Library-Exclusive Highlights

| Component | Library | Why Notable |
|-----------|---------|-------------|
| Splitter | Chakra | Resizable pane divider — uncommon in component libs |
| QR Code | Chakra | Built-in QR SVG generator |
| Bleed | Chakra | Negative-margin utility for full-bleed inside containers |
| Rich Text Editor | Chakra | Full WYSIWYG — most libs omit this |
| Action Bar | Chakra | Contextual floating toolbar on selection |
| Presence | Chakra | Animation-aware deferred unmount |
| Floating Window | Mantine | Draggable + resizable floating UI panel |
| Floating Indicator | Mantine | Animated underline/highlight tracking active item |
| RollingNumber | Mantine | Digit-roll animation for changing values |
| Overflow List | Mantine | Smart "+N more" collapse for nav/tag lists |
| Angle Slider | Mantine | Circular degree input |
| JSON Input | Mantine | Validated JSON textarea |
| Mask Input | Mantine | Character-mask formatted input |
| TreeSelect | Mantine | Nested tree inside a select dropdown |
| Semi-Circle Progress | Mantine | Gauge-style half-ring progress |
| AppShell | Mantine | Opinionated full-app layout compositor |
| Table of Contents | Mantine | Scrollspy-linked heading navigation |
| Refresher | Ionic | Pull-to-refresh mobile gesture |
| Infinite Scroll | Ionic | Load-more trigger at scroll bottom |
| Reorder | Ionic | Native-feel drag-to-reorder list |
| Action Sheet | Ionic | iOS/Android native-style bottom action menu |
| Toggle Button Group | Joy UI | Mutually exclusive or multi-select inline button set |

---

## Library Scope Clarification

`packages/ui` = generic primitive library. Think Chakra UI / Mantine / Ionic — knows nothing about orgs, billing, users, or tRPC. If it imports from `@cruzjs/core` or `@cruzjs/start`, it does not belong here.

**In `packages/ui`:** Button, Select, Modal, Table, Avatar, Badge, Tabs, Accordion, Toast, Skeleton, Progress, Drawer, Popover, Tooltip, DatePicker, Slider, StatCard (generic), EmptyState, PageHeader (generic)...

**Stays in `packages/start`:** OrgCard, OrgHeader, MemberRow, ApiKeyManager, OrgSwitcher, InvitationForm, DashboardGrid, NotificationBell — all domain-coupled.

**Stays in `packages/saas`:** BillingCard, AuditLog, PlanSelector — all billing-domain.

---

## Progress Log

### 2026-05-24

1. **ConfirmModal.tsx** — rewrote from Chakra Modal to native `<dialog>` + Tailwind. Last Chakra runtime import eliminated from `packages/ui`.

2. **Hardcoded color sweep** — fixed 150+ violations across 30+ files:
   - `packages/ui/` — 7 files: PageHeader, InlineSelect, StatCard, DetailRow, FilterPill, SectionCard, ActionItem
   - `packages/core/src/auth/` — 7 files: LoginForm, RegisterForm, PasswordResetForm, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage, AuthLayout
   - `packages/start/src/` — 14 files: ProfilePage, OrgCard, CreateOrgPage, OrgOverviewPage, OrgInvitationsPage, MemberRow, OrgLayout, LiveEventFeed + 6 integration config files
   - `packages/saas/src/` — 2 files: OrgCard, OrgBillingPage
   - `apps/web/src/routes/index.tsx` — landing page nav

3. **Verification** — grep confirms zero `slate-`, `gray-`, `indigo-`, or non-overlay `bg-white` remain in runtime code. All pages visually verified in browser.

---

## CruzJS Existing Components (Inventory)

Components currently living in the codebase. Rule: if it imports from `@cruzjs/core`, `@cruzjs/start`, tRPC, or any domain model → it does not belong in `packages/ui`.

### `packages/ui/src/components/` — Audit (16)

| Component | Verdict | Action |
|-----------|---------|--------|
| **ActionItem** | ✅ Generic | Keep; expose `variant` prop |
| **BulkActionsBar** | ✅ Generic | Keep; API already good |
| **ConfirmModal** | ✅ Generic | Keep; add `destructive` variant; already native `<dialog>` |
| **DetailRow** | ✅ Generic | Keep |
| **FilterPill** | ✅ Generic | Keep |
| **FormControls** (Input, Select, FilterBar) | ✅ Generic | Keep; add `error`/`helper` props |
| **InlineSelect** | ✅ Generic | Keep |
| **OrgHeader** | ❌ Domain-coupled | Move to `packages/start` |
| **PageHeader** | ✅ Generic | Keep; add breadcrumb slot |
| **SearchFilterBar** | ✅ Generic | Keep; decouple stats slot |
| **SectionCard** | ✅ Generic | Keep |
| **StatCard** | ✅ Generic | Keep; add `delta`/`trend` prop |
| **StateComponents** (PermissionDenied, LoadingState, EmptyState) | ✅ Generic | Split into 3 named exports |
| **TabNavigation** | ⚠️ Router-coupled | Decouple from React Router; accept `onTabChange` + active prop |
| **ThresholdApprovalModal** | ❌ Domain-coupled | Move to domain package |
| **Toast / ToastProvider / useToast** | ✅ Generic | Keep; standardize position/stack behavior |

### `packages/start/src/` — Business Logic (needs extraction where generic)

| Component | Current Location | → Abstract? | Notes |
|-----------|-----------------|-------------|-------|
| **AppLayout** | `start/src/layout/` | Partial | Extract shell structure; keep nav wiring in start |
| **Navbar** | `start/src/layout/` | No | Too app-coupled (org switcher, auth menu) |
| **OrgSwitcher** | `start/src/orgs/` | No | Domain-specific |
| **CreateOrgModal** | `start/src/orgs/` | No | Domain-specific |
| **OrgCard** | `start/src/orgs/` | No | Domain-specific |
| **MemberRow** | `start/src/members/` | No | Domain-specific |
| **MembersList** | `start/src/members/` | No | Domain-specific |
| **InvitationForm** | `start/src/members/` | No | Domain-specific |
| **RoleSelector** | `start/src/members/` | Partial | Generic dropdown — extract as `Select` variant |
| **ApiKeyManager** | `start/src/api-keys/` | No | Domain-specific |
| **CreateApiKeyModal** | `start/src/api-keys/` | Partial | Pattern reusable — extract `CopyableSecretModal` |
| **FileUpload** | `start/src/` | **Yes → Abstract** | Generic drag-drop upload; move to `ui` |
| **FormField** | `start/src/` | **Yes → Abstract** | label + input + error + helper wrapper; core primitive |
| **DashboardGrid** | `start/src/dashboard/` | Partial | Extract grid layout; keep widget registry in start |
| **DashboardBuilder** | `start/src/dashboard/` | No | App-specific |
| **StatWidget, ChartWidget, etc.** | `start/src/dashboard/` | Partial | StatWidget → generalize as StatCard variant |
| **NotificationBell** | `start/src/` | Partial | Extract generic bell+badge+tray pattern |
| **AiConnectionsManager** | `start/src/ai-connections/` | No | Domain-specific |
| **LiveEventFeed** | `start/src/` | Partial | Extract generic activity-feed component |

### `packages/core/src/` — Framework Auth Components

| Component | Current Location | → Abstract? | Notes |
|-----------|-----------------|-------------|-------|
| **LoginForm** | `core/src/auth/components/` | Partial | Extract form shell; keep auth logic in core |
| **RegisterForm** | `core/src/auth/components/` | Partial | Same — separate layout from logic |
| **PasswordResetForm** | `core/src/auth/components/` | Partial | Same |
| **AuthLayout** | `core/src/framework/components/` | **Yes → Abstract** | Generic centered-card layout for auth pages |

---

## Components to Add to CruzJS UI (Gaps vs. Reference Libraries)

Things the reference libraries have that CruzJS currently lacks entirely.

### High Priority (foundational, commonly needed)

| Component | Inspired By | Description |
|-----------|-------------|-------------|
| **Alert** | All libs | Inline status message: success/warning/error/info; icon + title + body; dismissible |
| **Badge** | All libs | Small count or label chip; dot variant; status color |
| **Avatar** | All libs | Image + initials fallback; size variants; group/stack |
| **Tooltip** | All libs | Hover info; placement; delay; arrow |
| **Spinner / Loader** | All libs | Indeterminate spin; size + color; center utility |
| **Skeleton** | All libs | Shimmer placeholder; circle/rect/text variants |
| **Progress (linear)** | All libs | Horizontal bar; determinate + indeterminate; label |
| **Progress (circular)** | Joy, Mantine | Ring with percentage label |
| **Modal / Dialog** | All libs | Generalize ConfirmModal into full composable dialog |
| **Drawer** | All libs | Slide-in panel from any edge |
| **Popover** | All libs | Anchored floating box; click or hover trigger |
| **Accordion** | All libs | Expand/collapse sections; single or multi |
| **Tabs** | All libs | Decouple TabNavigation from router; pure UI tabs |
| **Table** | All libs | Sortable/striped/bordered; replaces raw `<table>` usage |
| **Card** | All libs | Generalize SectionCard; header/body/footer slots |
| **Pagination** | Mantine, Joy | Page controls; size variants |
| **Steps / Stepper** | Chakra, Joy, Mantine | Wizard progress; horizontal + vertical |
| **Select (styled)** | All libs | Replace native `<select>`; searchable; grouped options |
| **Combobox** | Chakra, Mantine | Autocomplete text input with option list |
| **Checkbox** | All libs | Indeterminate state; group wrapper |
| **Radio Group** | All libs | Radio buttons with group container |
| **Switch** | All libs | Toggle boolean; animated thumb |
| **Slider** | All libs | Range input; marks; tooltip value |
| **Input (base)** | All libs | Standardize — prefix/suffix icons; sizes; error state |
| **Textarea** | All libs | Autosize; char count; max-rows |
| **Number Input** | Chakra, Mantine | Stepper +/−; min/max/step; precision |
| **Password Input** | Chakra, Mantine | Show/hide toggle; strength meter |
| **Pin Input** | Chakra, Mantine | OTP code; N boxes; auto-advance |

### Medium Priority (app-level patterns)

| Component | Inspired By | Description |
|-----------|-------------|-------------|
| **Notification / Toast (unified)** | All libs | Unify existing Toast + add stacking, positions, rich content |
| **Breadcrumbs** | All libs | Path trail; router-aware; overflow ellipsis |
| **Menu** | All libs | Dropdown action list; nested submenus; dividers |
| **Hover Card** | Chakra, Mantine | Rich preview popup on hover |
| **Carousel** | Chakra, Mantine | Slides; autoplay; dots; arrows |
| **Stat (with trend)** | Chakra, Mantine | Extend StatCard with delta/trend arrow |
| **Timeline** | Chakra, Mantine | Vertical event list; custom icons |
| **File Upload (generalized)** | Chakra, Mantine | Extract existing FileUpload; drag-drop zone; MIME filter |
| **Color Picker** | Chakra, Mantine | Saturation canvas + hue + alpha |
| **Tags Input** | Chakra, Mantine | Type-to-add tag list; creatable |
| **Date Picker** | Chakra, Ionic | Calendar popover on text input |
| **Segmented Control** | Ionic, Mantine | Inline multi-option selector |
| **Rating** | Mantine | Star rating input |
| **Empty State** | Chakra | Illustrated zero-state; title + description + CTA |
| **Status Dot** | Chakra | Online/offline/busy colored indicator |
| **Copy Button** | Mantine | Clipboard copy with "copied" feedback |
| **Scroll Area** | Chakra, Mantine | Custom-styled scrollbar region |
| **Collapsible** | Chakra, Mantine | Animate any block open/closed |
| **Activity Feed** | Chakra Pro | Generalize LiveEventFeed; event rows + timestamps |
| **Notification Tray** | Chakra Pro | Badge bell + dropdown list + mark-read |

### Lower Priority (specialized)

| Component | Inspired By | Description |
|-----------|-------------|-------------|
| **Splitter** | Chakra | Resizable panes |
| **QR Code** | Chakra | String → SVG QR |
| **Rich Text Editor** | Chakra | WYSIWYG editor |
| **Marquee** | Chakra, Mantine | Auto-scroll ticker |
| **Mask Input** | Mantine | Phone/date character-mask |
| **JSON Input** | Mantine | Textarea with JSON validation |
| **Floating Window** | Mantine | Draggable + resizable panel |
| **Infinite Scroll** | Ionic | Load-more at scroll bottom |
| **Drag-and-Drop List** | Mantine | Reorderable list (dnd-kit already used in DashboardGrid) |
| **Tree** | Mantine | Hierarchical expand/collapse node tree |
| **Table of Contents** | Mantine | Scrollspy heading nav |

---

## Extraction Action Plan

### Phase 1 — Move ready generics from `ui` package (no logic changes)
1. Split `StateComponents` → `EmptyState`, `LoadingState`, `PermissionDenied` named exports
2. Add `error`/`helper` props to `FormControls.Input` and `FormControls.Select`
3. Add breadcrumb slot to `PageHeader`
4. Add `delta`/`trend` prop to `StatCard`
5. Add `destructive` variant to `ConfirmModal`

### Phase 2 — Extract from `start` into `ui`
1. **`FormField`** → move to `ui`; just label + input slot + error + helper
2. **`FileUpload`** → move to `ui`; remove tRPC dependency, accept callback props
3. **`AuthLayout`** → move to `ui`; pure layout, no auth logic
4. **`CopyableSecretModal`** → extract pattern from `CreateApiKeyModal`

### Phase 3 — Build new primitives (highest-value gaps)
Order: Alert → Badge → Avatar → Tooltip → Tabs (decoupled) → Modal (composable) → Drawer → Select (styled) → Checkbox/Radio/Switch → Skeleton → Progress → Pagination

### Phase 4 — Build composite patterns
Breadcrumbs → Menu → Accordion → Table → Stepper → Notification Tray → Activity Feed → Date Picker

### Phase 6 — Composed Blocks (Chakra Pro-Inspired Experiences)

Clean-room rewrites of app-level patterns. Generic — zero domain coupling. Built with HIG-inspired "Refined Kinetic" design system.

#### Layout & Chrome
| Component | Description |
|-----------|-------------|
| **Divider** | Horizontal/vertical separator; text/icon/button inset variants |
| **AppShell** | Full app layout compositor: sidebar + header + main + footer |
| **Sidebar** | Collapsible vertical nav; icon-only collapsed mode; grouped items; nested |
| **Navbar** | Horizontal top nav; search slot; action slots; responsive → hamburger |
| **PageShell** | Page header + tabs + content area; breadcrumb integration |
| **Burger** | Animated hamburger ↔ X toggle for sidebar open/close |

#### Command & Navigation
| Component | Description |
|-----------|-------------|
| **CommandPalette** | Cmd+K search modal; fuzzy match; action groups; keyboard-first |
| **UserMenu** | Avatar-triggered popover; links + logout slot |
| **OrgSwitcher** | Generic entity dropdown switcher; avatar + create CTA |
| **Kbd** | Keyboard shortcut key styling; combo support (Cmd+K, Shift+Enter) |
| **ActionBar** | Floating toolbar on row selection; action buttons; count badge |

#### Onboarding & Engagement
| Component | Description |
|-----------|-------------|
| **OnboardingChecklist** | Step-by-step task list; progress bar; collapsible |
| **OnboardingCarousel** | Image/video slide sequence; dots; skip/next/done |
| **Spoiler** | Truncated long content with "show more/less" toggle |

#### Sharing & Collaboration
| Component | Description |
|-----------|-------------|
| **SharingDialog** | Invite by email; link copy; permission select dropdown |
| **PropertyPanel** | Side panel form for editing selected item properties |
| **ProfileCard** | User card variants: compact, detailed, social stats, team |

#### Data & Dashboard
| Component | Description |
|-----------|-------------|
| **StatsGrid** | Dashboard KPI card grid with trend indicators; responsive |
| **DataTable** | Sort/filter/paginate; row selection; bulk actions; column resize |
| **FeedView** | Activity/comment stream; upvote; reply; threaded |
| **ChartContainer** | Responsive chart wrapper; title/subtitle; legend slot; empty state |
| **AuditLog** | Timestamped event table; user/action/resource columns; filters |

#### Pricing & Billing
| Component | Description |
|-----------|-------------|
| **PricingCards** | Plan tier cards; feature checklist; CTA; popular badge |

#### Settings Patterns
| Component | Description |
|-----------|-------------|
| **SettingsLayout** | Settings page shell: sidebar nav + content area |
| **SettingsSection** | Card section with title/description + form content slot |
| **NotificationPreferences** | Per-channel toggle grid; email/push/in-app columns |
| **ApiKeyCard** | API key display; masked value; copy; revoke; metadata |
| **WebhookManager** | Webhook CRUD + event log table + endpoint tester |
| **TeamRoster** | Member list; role badges; invite; remove action |

#### Auth Blocks
| Component | Description |
|-----------|-------------|
| **LoginBlock** | Email+password form; social OAuth row; remember me |
| **RegisterBlock** | Registration form; terms checkbox; social OAuth |
| **ForgotPasswordBlock** | Email request form block |
| **OtpVerificationBlock** | PIN input step; resend timer; verify CTA |

#### Developer Tools
| Component | Description |
|-----------|-------------|
| **CodePlayground** | Split editor + preview pane; language tabs |
| **AiPromptInput** | Chat-style input; send button; attach; streaming display |

### Phase 7 — Marketing Blocks

Clean-room marketing page components. Generic — zero domain coupling. Slot-based composition.

| Component | Description |
|-----------|-------------|
| **HeroSection** | Full-width hero; heading/subheading/CTA slots; image/video/gradient bg variants |
| **FeatureGrid** | Feature card grid; icon + title + description; 2/3/4 column responsive |
| **TestimonialCarousel** | Quote cards; avatar + name + role; auto-rotate; dots nav |
| **CTASection** | Call-to-action banner; heading + description + button(s); tonal bg variants |
| **LogoCloud** | Partner/client logo grid; grayscale → color on hover; auto-sizing |
| **TeamGrid** | Team member cards; avatar + name + role + social links; responsive grid |
| **BlogCards** | Article preview cards; image + title + excerpt + author + date + tag |
| **FAQSection** | Accordion-based FAQ; search filter; category tabs |
| **CareerCards** | Job listing cards; title + department + location + type badges |
| **ContactSection** | Contact form + info block; map slot; social links |
| **Banner** | Dismissible top/bottom banner; icon + text + CTA; sticky option |
| **Footer** | Multi-column footer; logo + nav links + social + legal; responsive |
| **MarketingNavbar** | Landing page navbar; transparent/solid toggle on scroll; CTA button |
| **HelpCenter** | Search + category cards + popular articles; knowledge base shell |

### Phase 8 — Documentation Blocks

Clean-room docs page components. Built for technical documentation sites.

| Component | Description |
|-----------|-------------|
| **DocSidebar** | Docs navigation sidebar; nested sections; active indicator; collapsible |
| **DocHeader** | Docs page header; title + description + breadcrumb + "edit on GitHub" link |
| **CodeBlock** | Syntax-highlighted code block; copy button; line numbers; filename tab; language badge |
| **ExamplePreview** | Live component preview + source code toggle; resizable preview pane |
| **ParameterField** | API parameter row; name + type badge + required flag + description + default |
| **Changelog** | Version timeline; date + version badge + categorized changes (added/fixed/changed) |
