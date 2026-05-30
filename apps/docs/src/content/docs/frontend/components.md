---
title: Component Library
description: Complete catalog of 124 components in @cruzjs/ui for building CruzJS applications.
---

The `@cruzjs/ui` package provides 124 production-grade React components with zero external dependencies. All components are themed via CSS variables, accessible, mobile-responsive, and SSR-safe.

```tsx
import { Button, Modal, DataTable, CommandPalette } from '@cruzjs/ui';
```

For interactive demos of every component, run [Storybook](/frontend/storybook).

---

## Primitives

Core building blocks used across the UI.

### Alert

Status messages with `info`, `success`, `warning`, and `danger` variants. Supports a title, description, and optional close button.

```tsx
import { Alert } from '@cruzjs/ui';

<Alert variant="success" title="Saved" description="Your changes have been saved." />
<Alert variant="danger" title="Error" description="Something went wrong." onClose={() => {}} />
```

### Avatar / AvatarGroup

User avatars with image, initials, or icon fallback. Supports status dots and size variants. `AvatarGroup` renders a stack with an overflow count.

```tsx
import { Avatar, AvatarGroup } from '@cruzjs/ui';

<Avatar src="/photo.jpg" name="Jane Doe" size="md" status="online" />
<AvatarGroup max={3}>
  <Avatar name="Alice" />
  <Avatar name="Bob" />
  <Avatar name="Carol" />
  <Avatar name="Dave" />
</AvatarGroup>
```

### Badge

Small labels and counts. Supports color variants and dot indicators.

```tsx
import { Badge } from '@cruzjs/ui';

<Badge>Active</Badge>
<Badge variant="danger">Overdue</Badge>
<Badge variant="success" dot>Online</Badge>
```

### Breadcrumbs

Navigation breadcrumb trail with separator and current-page highlighting.

```tsx
import { Breadcrumbs } from '@cruzjs/ui';

<Breadcrumbs items={[
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/projects' },
  { label: 'Settings' },
]} />
```

### Card

Content container with optional header, body, and footer sections.

```tsx
import { Card } from '@cruzjs/ui';

<Card>
  <Card.Header title="Project Details" action={<Button size="sm">Edit</Button>} />
  <Card.Body>
    <p>Project content goes here.</p>
  </Card.Body>
  <Card.Footer>
    <Button variant="primary">Save</Button>
  </Card.Footer>
</Card>
```

### Divider

Horizontal or vertical separator. Supports text or icon content in the center.

```tsx
import { Divider } from '@cruzjs/ui';

<Divider />
<Divider>or</Divider>
<Divider orientation="vertical" />
```

### Kbd

Keyboard shortcut display. Renders individual keys with proper styling.

```tsx
import { Kbd } from '@cruzjs/ui';

<Kbd>Cmd</Kbd> + <Kbd>K</Kbd>
```

### Spinner

Loading spinner animation. Available in multiple sizes.

```tsx
import { Spinner } from '@cruzjs/ui';

<Spinner size="sm" />
<Spinner size="xl" />
```

### Skeleton

Content loading placeholders that match the shape of real content.

```tsx
import { Skeleton } from '@cruzjs/ui';

<Skeleton width="200px" height="20px" />
<Skeleton variant="circular" size="48px" />
<Skeleton variant="text" lines={3} />
```

### StatusDot

Colored status indicator dot with optional pulse animation.

```tsx
import { StatusDot } from '@cruzjs/ui';

<StatusDot color="success" />
<StatusDot color="danger" pulse />
```

### Tooltip

Hover information tooltip. Automatically hidden on mobile (touch devices) where the information is shown inline instead.

```tsx
import { Tooltip } from '@cruzjs/ui';

<Tooltip content="Copy to clipboard">
  <button>Copy</button>
</Tooltip>
```

---

## Forms & Inputs

### Input

Text input with error/helper text, leading/trailing icons, and size variants.

```tsx
import { Input } from '@cruzjs/ui';

<Input label="Email" placeholder="you@example.com" type="email" />
<Input label="Search" leadingIcon={<SearchIcon />} />
<Input label="Name" error="Name is required" />
```

### Textarea

Multi-line text input with optional auto-resize.

```tsx
import { Textarea } from '@cruzjs/ui';

<Textarea label="Description" rows={4} placeholder="Describe your project..." />
<Textarea label="Notes" autoResize />
```

### NumberInput

Numeric input with increment/decrement buttons.

```tsx
import { NumberInput } from '@cruzjs/ui';

<NumberInput label="Quantity" min={0} max={100} step={1} value={5} onChange={setValue} />
```

### PasswordInput

Password field with show/hide toggle button.

```tsx
import { PasswordInput } from '@cruzjs/ui';

<PasswordInput label="Password" placeholder="Enter your password" />
```

### PinInput

PIN/OTP code entry with individual digit boxes. Supports auto-focus advance and paste handling.

```tsx
import { PinInput } from '@cruzjs/ui';

<PinInput length={6} onComplete={(code) => verify(code)} />
```

### MaskInput

Masked input for formatted data like phone numbers, SSNs, or credit cards.

```tsx
import { MaskInput } from '@cruzjs/ui';

<MaskInput label="Phone" mask="(###) ###-####" placeholder="(555) 123-4567" />
```

### Select

Dropdown select with optional search filtering.

```tsx
import { Select } from '@cruzjs/ui';

<Select
  label="Role"
  options={[
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
    { value: 'viewer', label: 'Viewer' },
  ]}
  value={role}
  onChange={setRole}
/>
```

### Combobox

Searchable select with support for custom options and async loading.

```tsx
import { Combobox } from '@cruzjs/ui';

<Combobox
  label="Assignee"
  options={users}
  value={assignee}
  onChange={setAssignee}
  placeholder="Search users..."
/>
```

### Checkbox

Checkbox with label and indeterminate state support.

```tsx
import { Checkbox } from '@cruzjs/ui';

<Checkbox label="Accept terms" checked={accepted} onChange={setAccepted} />
<Checkbox label="Select all" indeterminate />
```

### RadioGroup

Radio button group with horizontal and vertical orientations.

```tsx
import { RadioGroup } from '@cruzjs/ui';

<RadioGroup
  label="Plan"
  options={[
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
  ]}
  value={plan}
  onChange={setPlan}
/>
```

### Switch

Toggle switch for boolean settings.

```tsx
import { Switch } from '@cruzjs/ui';

<Switch label="Enable notifications" checked={enabled} onChange={setEnabled} />
```

### Slider

Range slider with single or dual thumbs for range selection.

```tsx
import { Slider } from '@cruzjs/ui';

<Slider label="Volume" min={0} max={100} value={volume} onChange={setVolume} />
<Slider label="Price range" range min={0} max={1000} value={[200, 800]} onChange={setRange} />
```

### DatePicker

Calendar date picker. Renders as a bottom sheet on mobile.

```tsx
import { DatePicker } from '@cruzjs/ui';

<DatePicker label="Start date" value={date} onChange={setDate} />
<DatePicker label="Range" mode="range" value={dateRange} onChange={setDateRange} />
```

### ColorPicker

Color selection with swatches, custom hex input, and opacity slider.

```tsx
import { ColorPicker } from '@cruzjs/ui';

<ColorPicker label="Brand color" value={color} onChange={setColor} />
```

### TagsInput

Multi-value tag input with add/remove and optional suggestions.

```tsx
import { TagsInput } from '@cruzjs/ui';

<TagsInput label="Tags" value={tags} onChange={setTags} placeholder="Add a tag..." />
```

### JSONInput

JSON editor with syntax highlighting and validation.

```tsx
import { JSONInput } from '@cruzjs/ui';

<JSONInput label="Config" value={json} onChange={setJson} />
```

### RichTextEditor

Rich text editing with a formatting toolbar (bold, italic, lists, links, headings).

```tsx
import { RichTextEditor } from '@cruzjs/ui';

<RichTextEditor label="Content" value={html} onChange={setHtml} />
```

### FileUploadZone

Drag-and-drop file upload area with progress indicator and file type validation.

```tsx
import { FileUploadZone } from '@cruzjs/ui';

<FileUploadZone
  accept={{ 'image/*': ['.png', '.jpg'] }}
  maxSize={5_000_000}
  onUpload={handleUpload}
/>
```

### FormField

Form field wrapper that provides consistent label, error message, description, and required indicator styling.

```tsx
import { FormField, Input } from '@cruzjs/ui';

<FormField label="Email" error={errors.email} description="We'll never share your email." required>
  <Input type="email" value={email} onChange={setEmail} />
</FormField>
```

### AiPromptInput

Chat-style AI input with send button, file attachment, and streaming indicator.

```tsx
import { AiPromptInput } from '@cruzjs/ui';

<AiPromptInput
  placeholder="Ask anything..."
  onSend={handleSend}
  isStreaming={isStreaming}
/>
```

---

## Layout

### AppShell

Full application layout: sidebar + header + main content + footer. Handles responsive collapse and mobile navigation.

```tsx
import { AppShell, Navbar, Sidebar } from '@cruzjs/ui';

<AppShell
  header={<Navbar brand={<Logo />} items={navItems} />}
  sidebar={<Sidebar groups={sidebarGroups} />}
  footer={<Footer />}
>
  <main>{children}</main>
</AppShell>
```

### Sidebar

Collapsible navigation sidebar with grouped items, nesting, icon-only collapsed mode, and mobile overlay.

```tsx
import { Sidebar } from '@cruzjs/ui';

<Sidebar
  groups={[
    { label: 'Main', items: [
      { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, href: '/' },
      { id: 'projects', label: 'Projects', icon: <FolderIcon />, href: '/projects' },
    ]},
  ]}
  activeId={location.pathname}
/>
```

### Navbar

Horizontal top navigation bar with brand, search, action items, and responsive hamburger menu.

```tsx
import { Navbar } from '@cruzjs/ui';

<Navbar
  brand={<Logo />}
  items={[
    { id: 'docs', label: 'Docs', href: '/docs' },
    { id: 'pricing', label: 'Pricing', href: '/pricing' },
  ]}
  actions={<UserMenu />}
/>
```

### PageShell

Page-level layout with header, tabs, breadcrumbs, and content area.

```tsx
import { PageShell } from '@cruzjs/ui';

<PageShell
  title="Project Settings"
  description="Manage your project configuration."
  breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Settings' }]}
  tabs={[
    { id: 'general', label: 'General' },
    { id: 'members', label: 'Members' },
    { id: 'danger', label: 'Danger Zone' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
>
  {content}
</PageShell>
```

### SettingsLayout

Settings page layout with a sidebar navigation and content area.

```tsx
import { SettingsLayout } from '@cruzjs/ui';

<SettingsLayout
  nav={[
    { id: 'general', label: 'General', href: '/settings' },
    { id: 'billing', label: 'Billing', href: '/settings/billing' },
    { id: 'team', label: 'Team', href: '/settings/team' },
  ]}
  activeId="general"
>
  <GeneralSettings />
</SettingsLayout>
```

### SettingsSection

Settings content card with title, description, and action area.

```tsx
import { SettingsSection } from '@cruzjs/ui';

<SettingsSection title="Organization Name" description="The display name for your org.">
  <Input value={name} onChange={setName} />
  <Button onClick={save}>Save</Button>
</SettingsSection>
```

### Splitter

Resizable split pane for horizontal or vertical layouts.

```tsx
import { Splitter } from '@cruzjs/ui';

<Splitter direction="horizontal" defaultSize={300}>
  <Splitter.Panel><Sidebar /></Splitter.Panel>
  <Splitter.Panel><MainContent /></Splitter.Panel>
</Splitter>
```

### ScrollArea

Custom scrollbar container with consistent cross-browser appearance.

```tsx
import { ScrollArea } from '@cruzjs/ui';

<ScrollArea height="400px">
  <LongContent />
</ScrollArea>
```

---

## Overlays & Feedback

### Modal

Dialog overlay. Renders centered on desktop, as a bottom sheet on mobile. Includes focus trap and scroll lock.

```tsx
import { Modal } from '@cruzjs/ui';

<Modal isOpen={isOpen} onClose={onClose} title="Confirm Action">
  <p>Are you sure you want to proceed?</p>
  <Modal.Footer>
    <Button variant="ghost" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal>
```

### Drawer

Slide-in panel from any edge (left, right, top, bottom).

```tsx
import { Drawer } from '@cruzjs/ui';

<Drawer isOpen={isOpen} onClose={onClose} position="right" title="Filters">
  <FilterForm />
</Drawer>
```

### Popover

Anchored floating panel triggered by click. Auto-positions to avoid viewport overflow.

```tsx
import { Popover } from '@cruzjs/ui';

<Popover trigger={<Button>Options</Button>}>
  <div className="p-4">Popover content</div>
</Popover>
```

### HoverCard

Rich preview panel on hover. Desktop only -- not rendered on touch devices.

```tsx
import { HoverCard } from '@cruzjs/ui';

<HoverCard trigger={<a href="/user/jane">Jane</a>}>
  <ProfileCard user={jane} variant="compact" />
</HoverCard>
```

### Menu

Dropdown action menu with keyboard navigation, icons, dividers, and nested submenus.

```tsx
import { Menu } from '@cruzjs/ui';

<Menu trigger={<Button>Actions</Button>}>
  <Menu.Item icon={<EditIcon />} onClick={onEdit}>Edit</Menu.Item>
  <Menu.Item icon={<CopyIcon />} onClick={onDuplicate}>Duplicate</Menu.Item>
  <Menu.Divider />
  <Menu.Item icon={<TrashIcon />} onClick={onDelete} variant="danger">Delete</Menu.Item>
</Menu>
```

### CommandPalette

`Cmd+K` fuzzy search modal with grouped actions. Supports keyboard navigation and custom rendering.

```tsx
import { CommandPalette } from '@cruzjs/ui';

<CommandPalette
  isOpen={isOpen}
  onClose={onClose}
  groups={[
    { label: 'Pages', items: [
      { id: 'dashboard', label: 'Dashboard', onSelect: () => navigate('/') },
      { id: 'settings', label: 'Settings', onSelect: () => navigate('/settings') },
    ]},
    { label: 'Actions', items: [
      { id: 'new-project', label: 'Create Project', onSelect: openCreateModal },
    ]},
  ]}
/>
```

### Notification

Toast-style notification with auto-dismiss. Supports `info`, `success`, `warning`, `danger` variants.

```tsx
import { Notification } from '@cruzjs/ui';

<Notification variant="success" title="Saved" description="Changes saved." onDismiss={onDismiss} />
```

### NotificationTray

Notification inbox popover with read/unread states and mark-all-read action.

```tsx
import { NotificationTray } from '@cruzjs/ui';

<NotificationTray
  notifications={notifications}
  unreadCount={3}
  onMarkRead={markRead}
  onMarkAllRead={markAllRead}
/>
```

### Progress

Linear progress bar with determinate and indeterminate modes.

```tsx
import { Progress } from '@cruzjs/ui';

<Progress value={65} max={100} />
<Progress indeterminate />
```

### ProgressCircular

Circular/ring progress indicator with label.

```tsx
import { ProgressCircular } from '@cruzjs/ui';

<ProgressCircular value={75} size="lg" label="75%" />
```

### CopyButton

Copy-to-clipboard button with visual success feedback.

```tsx
import { CopyButton } from '@cruzjs/ui';

<CopyButton value="npm install @cruzjs/ui" />
```

---

## Navigation

### Tabs

Tab panel with keyboard navigation and active indicator.

```tsx
import { Tabs } from '@cruzjs/ui';

<Tabs
  tabs={[
    { id: 'overview', label: 'Overview', content: <OverviewPanel /> },
    { id: 'activity', label: 'Activity', content: <ActivityPanel /> },
    { id: 'settings', label: 'Settings', content: <SettingsPanel /> },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Accordion

Collapsible content sections. Supports single or multiple open panels.

```tsx
import { Accordion } from '@cruzjs/ui';

<Accordion>
  <Accordion.Item title="Getting Started">
    <p>Welcome to the platform...</p>
  </Accordion.Item>
  <Accordion.Item title="Configuration">
    <p>Set up your preferences...</p>
  </Accordion.Item>
</Accordion>
```

### Collapsible

Single collapsible section with animated expand/collapse.

```tsx
import { Collapsible } from '@cruzjs/ui';

<Collapsible title="Advanced Options" defaultOpen={false}>
  <AdvancedSettings />
</Collapsible>
```

### Stepper

Multi-step wizard indicator showing progress through sequential steps.

```tsx
import { Stepper } from '@cruzjs/ui';

<Stepper
  steps={[
    { label: 'Account' },
    { label: 'Profile' },
    { label: 'Review' },
  ]}
  activeStep={1}
/>
```

### Pagination

Page navigation controls with page numbers, prev/next, and page size selector.

```tsx
import { Pagination } from '@cruzjs/ui';

<Pagination
  currentPage={page}
  totalPages={20}
  onPageChange={setPage}
/>
```

### SegmentedControl

Segmented toggle with a sliding active indicator. Alternative to tabs for filtering or view modes.

```tsx
import { SegmentedControl } from '@cruzjs/ui';

<SegmentedControl
  options={[
    { value: 'grid', label: 'Grid' },
    { value: 'list', label: 'List' },
  ]}
  value={view}
  onChange={setView}
/>
```

### Burger

Animated hamburger menu toggle button for mobile navigation.

```tsx
import { Burger } from '@cruzjs/ui';

<Burger isOpen={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
```

---

## Data Display

### Table

Basic data table with sorting and row selection.

```tsx
import { Table } from '@cruzjs/ui';

<Table
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
  ]}
  data={users}
/>
```

### DataTable

Full-featured data table: sorting, filtering, pagination, bulk actions, column resizing, and row selection.

```tsx
import { DataTable } from '@cruzjs/ui';

<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'created', label: 'Created', sortable: true },
  ]}
  data={projects}
  selectable
  onBulkAction={(action, ids) => handleBulk(action, ids)}
  pageSize={25}
/>
```

### Timeline

Chronological event timeline with icons and content.

```tsx
import { Timeline } from '@cruzjs/ui';

<Timeline items={[
  { icon: <CreateIcon />, title: 'Project created', time: '2 hours ago' },
  { icon: <EditIcon />, title: 'Settings updated', time: '1 hour ago' },
  { icon: <DeployIcon />, title: 'Deployed to production', time: '30 min ago' },
]} />
```

### ActivityFeed

Activity/event stream with user avatars, descriptions, and timestamps.

```tsx
import { ActivityFeed } from '@cruzjs/ui';

<ActivityFeed items={activities} />
```

### StatsGrid

Dashboard KPI card grid with trend indicators.

```tsx
import { StatsGrid } from '@cruzjs/ui';

<StatsGrid stats={[
  { label: 'Users', value: '1,284', trend: '+12%', trendDirection: 'up' },
  { label: 'Revenue', value: '$12,400', trend: '+8%', trendDirection: 'up' },
  { label: 'Errors', value: '3', trend: '-50%', trendDirection: 'down' },
]} />
```

### Carousel

Image/content carousel with dots and arrow navigation.

```tsx
import { Carousel } from '@cruzjs/ui';

<Carousel>
  <Carousel.Slide><img src="/slide1.jpg" alt="Slide 1" /></Carousel.Slide>
  <Carousel.Slide><img src="/slide2.jpg" alt="Slide 2" /></Carousel.Slide>
</Carousel>
```

### QRCode

QR code generator from string input.

```tsx
import { QRCode } from '@cruzjs/ui';

<QRCode value="https://example.com/invite/abc123" size={200} />
```

### Tree

Hierarchical tree view with expand/collapse and optional checkboxes.

```tsx
import { Tree } from '@cruzjs/ui';

<Tree
  data={[
    { id: '1', label: 'src', children: [
      { id: '2', label: 'components', children: [
        { id: '3', label: 'Button.tsx' },
      ]},
    ]},
  ]}
/>
```

### InfiniteScroll

Infinite scroll container that triggers loading when the user scrolls near the bottom.

```tsx
import { InfiniteScroll } from '@cruzjs/ui';

<InfiniteScroll onLoadMore={loadMore} hasMore={hasNextPage} loading={isFetchingNextPage}>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</InfiniteScroll>
```

### DragAndDropList

Reorderable list via drag and drop.

```tsx
import { DragAndDropList } from '@cruzjs/ui';

<DragAndDropList items={items} onReorder={setItems} renderItem={(item) => (
  <div>{item.label}</div>
)} />
```

### TableOfContents

Document outline navigation that highlights the current section.

```tsx
import { TableOfContents } from '@cruzjs/ui';

<TableOfContents headings={headings} activeId={activeHeading} />
```

### FloatingWindow

Draggable and resizable floating panel.

```tsx
import { FloatingWindow } from '@cruzjs/ui';

<FloatingWindow title="Debug Console" defaultPosition={{ x: 100, y: 100 }}>
  <LogViewer />
</FloatingWindow>
```

### Marquee

Scrolling content ticker for announcements or logos.

```tsx
import { Marquee } from '@cruzjs/ui';

<Marquee speed="slow">
  <span>Breaking news: CruzJS v2 released!</span>
</Marquee>
```

### EmptyState

Empty state illustration with message and optional action.

```tsx
import { EmptyState } from '@cruzjs/ui';

<EmptyState
  message="No projects yet."
  icon={<FolderIcon />}
  action={<Button onClick={onCreate}>Create Project</Button>}
/>
```

### Spoiler

Truncated content with a "show more" toggle.

```tsx
import { Spoiler } from '@cruzjs/ui';

<Spoiler maxHeight={100}>
  <p>Long content that will be truncated with a toggle to expand...</p>
</Spoiler>
```

### Rating

Star rating display and input.

```tsx
import { Rating } from '@cruzjs/ui';

<Rating value={4} max={5} onChange={setRating} />
<Rating value={3.5} readOnly />
```

### ChartContainer

Chart wrapper with title, legend, and empty state fallback.

```tsx
import { ChartContainer } from '@cruzjs/ui';

<ChartContainer title="Revenue" legend={['Current', 'Previous']}>
  <YourChartComponent data={chartData} />
</ChartContainer>
```

---

## Application Blocks

Pre-composed patterns for common SaaS features. These are higher-level components that combine multiple primitives.

### LoginBlock

Email + password login form with social OAuth buttons.

```tsx
import { LoginBlock } from '@cruzjs/ui';

<LoginBlock
  onSubmit={handleLogin}
  socialProviders={['google', 'github']}
  onSocialLogin={handleSocialLogin}
  forgotPasswordHref="/auth/forgot-password"
/>
```

### RegisterBlock

Registration form with email, password, and terms checkbox.

```tsx
import { RegisterBlock } from '@cruzjs/ui';

<RegisterBlock onSubmit={handleRegister} loginHref="/auth/login" />
```

### ForgotPasswordBlock

Password reset email form.

```tsx
import { ForgotPasswordBlock } from '@cruzjs/ui';

<ForgotPasswordBlock onSubmit={handleForgotPassword} loginHref="/auth/login" />
```

### OtpVerificationBlock

OTP/PIN verification step with resend functionality.

```tsx
import { OtpVerificationBlock } from '@cruzjs/ui';

<OtpVerificationBlock length={6} onVerify={handleVerify} onResend={handleResend} />
```

### AuthLayout

Centered auth card layout with logo and background.

```tsx
import { AuthLayout } from '@cruzjs/ui';

<AuthLayout logo={<Logo />}>
  <LoginBlock onSubmit={handleLogin} />
</AuthLayout>
```

### CopyableSecretModal

Modal for displaying secrets (API keys, tokens) with copy-to-clipboard and a warning that the secret will not be shown again.

```tsx
import { CopyableSecretModal } from '@cruzjs/ui';

<CopyableSecretModal isOpen={isOpen} onClose={onClose} secret={apiKey} title="API Key Created" />
```

### UserMenu

Avatar-triggered user popover menu with profile, settings, and sign out links.

```tsx
import { UserMenu } from '@cruzjs/ui';

<UserMenu user={{ name: 'Jane Doe', email: 'jane@example.com', avatar: '/photo.jpg' }} />
```

### OrgSwitcher

Organization/workspace dropdown switcher with search and create option.

```tsx
import { OrgSwitcher } from '@cruzjs/ui';

<OrgSwitcher orgs={orgs} activeOrg={currentOrg} onSwitch={switchOrg} onCreateNew={openCreateModal} />
```

### ProfileCard

User profile card in compact, detailed, or social layout variants.

```tsx
import { ProfileCard } from '@cruzjs/ui';

<ProfileCard user={user} variant="detailed" />
```

### TeamRoster

Team member list with roles, invite button, and remove action.

```tsx
import { TeamRoster } from '@cruzjs/ui';

<TeamRoster
  members={members}
  onInvite={openInviteModal}
  onRemove={handleRemove}
  onRoleChange={handleRoleChange}
/>
```

### OnboardingChecklist

Step-by-step onboarding task list with completion tracking.

```tsx
import { OnboardingChecklist } from '@cruzjs/ui';

<OnboardingChecklist steps={[
  { id: 'profile', label: 'Complete your profile', completed: true },
  { id: 'invite', label: 'Invite a team member', completed: false },
  { id: 'project', label: 'Create your first project', completed: false },
]} />
```

### OnboardingCarousel

Onboarding slide walkthrough with progress dots and skip button.

```tsx
import { OnboardingCarousel } from '@cruzjs/ui';

<OnboardingCarousel slides={slides} onComplete={finishOnboarding} />
```

### SharingDialog

Invite-by-email dialog with permission level selector.

```tsx
import { SharingDialog } from '@cruzjs/ui';

<SharingDialog
  isOpen={isOpen}
  onClose={onClose}
  onInvite={handleInvite}
  permissions={['viewer', 'editor', 'admin']}
/>
```

### PropertyPanel

Sidebar form panel for editing object properties.

```tsx
import { PropertyPanel } from '@cruzjs/ui';

<PropertyPanel title="Node Properties" fields={fields} values={nodeData} onChange={updateNode} />
```

### FeedView

Activity/comment stream with replies and reactions.

```tsx
import { FeedView } from '@cruzjs/ui';

<FeedView items={comments} onReply={handleReply} onReact={handleReact} />
```

### PricingCards

Plan tier cards with feature checklists and CTA buttons.

```tsx
import { PricingCards } from '@cruzjs/ui';

<PricingCards plans={[
  { name: 'Free', price: '$0', features: ['5 projects', '1 GB storage'], cta: 'Get Started' },
  { name: 'Pro', price: '$29', features: ['Unlimited projects', '100 GB storage'], cta: 'Upgrade', highlighted: true },
]} />
```

### ApiKeyCard

API key display with mask toggle, copy button, and revoke action.

```tsx
import { ApiKeyCard } from '@cruzjs/ui';

<ApiKeyCard name="Production Key" keyValue="sk_live_abc...xyz" createdAt="2025-01-15" onRevoke={handleRevoke} />
```

### AuditLog

Timestamped event table with filters for actor, action, and resource.

```tsx
import { AuditLog } from '@cruzjs/ui';

<AuditLog events={events} filters={['actor', 'action', 'resource']} />
```

### WebhookManager

Webhook CRUD interface with event log and test functionality.

```tsx
import { WebhookManager } from '@cruzjs/ui';

<WebhookManager
  webhooks={webhooks}
  availableEvents={['user.created', 'project.updated']}
  onCreate={handleCreate}
  onDelete={handleDelete}
  onTest={handleTest}
/>
```

### NotificationPreferences

Per-channel notification toggle grid (email, push, in-app).

```tsx
import { NotificationPreferences } from '@cruzjs/ui';

<NotificationPreferences
  categories={[
    { id: 'security', label: 'Security Alerts', channels: { email: true, push: true, inApp: true } },
    { id: 'marketing', label: 'Marketing', channels: { email: false, push: false, inApp: true } },
  ]}
  onChange={handleChange}
/>
```

### ActionBar

Floating toolbar that appears when rows are selected in a table or list.

```tsx
import { ActionBar } from '@cruzjs/ui';

<ActionBar
  selectedCount={selectedIds.length}
  actions={[
    { label: 'Archive', onClick: handleArchive },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' },
  ]}
  onClear={clearSelection}
/>
```

### CodePlayground

Split editor + preview pane with file tabs for interactive code demos.

```tsx
import { CodePlayground } from '@cruzjs/ui';

<CodePlayground
  files={[
    { name: 'App.tsx', language: 'tsx', content: '...' },
    { name: 'styles.css', language: 'css', content: '...' },
  ]}
  preview={<iframe src={previewUrl} />}
/>
```

---

## Marketing Blocks

Ready-to-use sections for landing pages and marketing sites.

### HeroSection

Full-width hero with heading, subheading, CTA buttons, and optional media.

```tsx
import { HeroSection } from '@cruzjs/ui';

<HeroSection
  title="Build faster with CruzJS"
  subtitle="Full-stack framework for Cloudflare."
  primaryCta={{ label: 'Get Started', href: '/docs' }}
  secondaryCta={{ label: 'View Demo', href: '/demo' }}
  media={<img src="/hero.png" alt="Dashboard screenshot" />}
/>
```

### FeatureGrid

Feature card grid with icons and descriptions.

```tsx
import { FeatureGrid } from '@cruzjs/ui';

<FeatureGrid features={[
  { icon: <RocketIcon />, title: 'Fast Deploys', description: 'Deploy in seconds to Cloudflare.' },
  { icon: <ShieldIcon />, title: 'Secure', description: 'Built-in auth and permissions.' },
  { icon: <CodeIcon />, title: 'Type-Safe', description: 'End-to-end TypeScript.' },
]} />
```

### TestimonialCarousel

Quote carousel with user avatars, names, and star ratings.

```tsx
import { TestimonialCarousel } from '@cruzjs/ui';

<TestimonialCarousel testimonials={[
  { quote: 'CruzJS saved us weeks of setup.', author: 'Jane Doe', role: 'CTO', avatar: '/jane.jpg', rating: 5 },
]} />
```

### CTASection

Call-to-action banner in subtle, bold, or gradient variants.

```tsx
import { CTASection } from '@cruzjs/ui';

<CTASection
  variant="gradient"
  title="Ready to get started?"
  description="Create your first project in under 5 minutes."
  cta={{ label: 'Start Free', href: '/signup' }}
/>
```

### LogoCloud

Partner/customer logo grid with grayscale-to-color hover effect.

```tsx
import { LogoCloud } from '@cruzjs/ui';

<LogoCloud logos={[
  { src: '/logos/acme.svg', alt: 'Acme Corp' },
  { src: '/logos/globex.svg', alt: 'Globex' },
]} />
```

### TeamGrid

Team member photo grid with names and titles.

```tsx
import { TeamGrid } from '@cruzjs/ui';

<TeamGrid members={[
  { name: 'Alice', role: 'CEO', photo: '/alice.jpg' },
  { name: 'Bob', role: 'CTO', photo: '/bob.jpg' },
]} />
```

### BlogCards

Article preview cards with tags, author, date, and read time.

```tsx
import { BlogCards } from '@cruzjs/ui';

<BlogCards posts={posts} />
```

### FAQSection

Accordion FAQ with optional search and category filtering.

```tsx
import { FAQSection } from '@cruzjs/ui';

<FAQSection items={[
  { question: 'How do I deploy?', answer: 'Run `cruz deploy production`.' },
  { question: 'Is there a free tier?', answer: 'Yes, the free plan includes...' },
]} searchable />
```

### CareerCards

Job listing cards with department and location badges.

```tsx
import { CareerCards } from '@cruzjs/ui';

<CareerCards jobs={[
  { title: 'Senior Engineer', department: 'Engineering', location: 'Remote', href: '/careers/se' },
]} />
```

### ContactSection

Contact form + info block layout with email, phone, and address.

```tsx
import { ContactSection } from '@cruzjs/ui';

<ContactSection
  onSubmit={handleContact}
  info={{ email: 'hello@example.com', phone: '+1 555-0100' }}
/>
```

### Banner

Dismissible announcement banner for promotions or notices.

```tsx
import { Banner } from '@cruzjs/ui';

<Banner variant="info" onDismiss={onDismiss}>
  Version 2.0 is live! <a href="/changelog">See what's new</a>
</Banner>
```

### Footer

Multi-column footer with navigation links, social icons, and legal text.

```tsx
import { Footer } from '@cruzjs/ui';

<Footer
  columns={[
    { title: 'Product', links: [{ label: 'Features', href: '/features' }] },
    { title: 'Company', links: [{ label: 'About', href: '/about' }] },
  ]}
  social={[{ icon: <GitHubIcon />, href: 'https://github.com/cruzjs' }]}
  legal="2025 CruzJS. All rights reserved."
/>
```

### MarketingNavbar

Landing page navbar with transparent-to-solid scroll transition.

```tsx
import { MarketingNavbar } from '@cruzjs/ui';

<MarketingNavbar
  brand={<Logo />}
  items={[{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }]}
  cta={{ label: 'Get Started', href: '/signup' }}
/>
```

### HelpCenter

Help center layout with search, categories, and article cards.

```tsx
import { HelpCenter } from '@cruzjs/ui';

<HelpCenter
  categories={[
    { label: 'Getting Started', articles: [...] },
    { label: 'Billing', articles: [...] },
  ]}
  onSearch={handleSearch}
/>
```

---

## Documentation Blocks

Components for building documentation sites.

### DocSidebar

Nested documentation navigation sidebar with search and section collapsing.

```tsx
import { DocSidebar } from '@cruzjs/ui';

<DocSidebar
  sections={[
    { label: 'Getting Started', items: [
      { label: 'Installation', href: '/docs/install' },
      { label: 'Quick Start', href: '/docs/quickstart' },
    ]},
  ]}
  activeHref={location.pathname}
/>
```

### DocHeader

Document page header with breadcrumb trail and "Edit on GitHub" link.

```tsx
import { DocHeader } from '@cruzjs/ui';

<DocHeader
  title="Installation"
  breadcrumbs={[{ label: 'Docs', href: '/docs' }, { label: 'Getting Started' }]}
  editUrl="https://github.com/cruzjs/cruzjs/edit/main/docs/install.md"
/>
```

### CodeBlock

Code display with syntax highlighting, line numbers, filename tab, and copy button.

```tsx
import { CodeBlock } from '@cruzjs/ui';

<CodeBlock language="tsx" filename="App.tsx" showLineNumbers>
  {`import { Button } from '@cruzjs/ui';

export function App() {
  return <Button>Click me</Button>;
}`}
</CodeBlock>
```

### ExamplePreview

Live preview + source code toggle for interactive component demos.

```tsx
import { ExamplePreview } from '@cruzjs/ui';

<ExamplePreview
  preview={<Button variant="primary">Click me</Button>}
  code={`<Button variant="primary">Click me</Button>`}
/>
```

### ParameterField

API parameter row displaying name, type, required indicator, and description.

```tsx
import { ParameterField } from '@cruzjs/ui';

<ParameterField name="onSubmit" type="(data: FormData) => void" required description="Called when the form is submitted." />
<ParameterField name="variant" type="'primary' | 'danger'" description="Visual style variant." />
```

### Changelog

Version timeline with categorized changes (added, changed, fixed, removed).

```tsx
import { Changelog } from '@cruzjs/ui';

<Changelog releases={[
  { version: '2.0.0', date: '2025-06-01', changes: [
    { type: 'added', description: 'New DataTable component' },
    { type: 'changed', description: 'Modal now renders as bottom sheet on mobile' },
    { type: 'fixed', description: 'DatePicker timezone handling' },
  ]},
]} />
```
