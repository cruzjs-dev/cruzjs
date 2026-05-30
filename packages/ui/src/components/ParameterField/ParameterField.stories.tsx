import type { Meta, StoryObj } from '@storybook/react';
import { ParameterField, ParameterFieldGroup } from './ParameterField';

// --- Meta ---

const meta = {
  title: 'Documentation/ParameterField',
  component: ParameterField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'API parameter documentation row. Displays parameter name, type, required/optional status, description, default values, and supports nested parameters for object types.',
      },
    },
  },
  argTypes: {
    name: { control: 'text' },
    type: { control: 'text' },
    required: { control: 'boolean' },
    description: { control: 'text' },
    defaultValue: { control: 'text' },
    deprecated: { control: 'boolean' },
  },
  args: {
    name: 'userId',
    type: 'string',
    required: false,
    description: 'The unique identifier of the user.',
  },
} satisfies Meta<typeof ParameterField>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default ---

export const Default: Story = {};

// --- Required ---

export const Required: Story = {
  args: {
    name: 'email',
    type: 'string',
    required: true,
    description: 'The email address for the account. Must be a valid email format.',
  },
  parameters: {
    docs: {
      description: {
        story: 'A required parameter displays a red "required" badge to indicate the field must be provided.',
      },
    },
  },
};

// --- WithDefault ---

export const WithDefault: Story = {
  args: {
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Maximum number of items to return per page.',
    defaultValue: '25',
  },
  parameters: {
    docs: {
      description: {
        story: 'An optional parameter with a default value displayed below the description.',
      },
    },
  },
};

// --- Deprecated ---

export const Deprecated: Story = {
  args: {
    name: 'api_key',
    type: 'string',
    required: false,
    deprecated: true,
    description: 'Use Authorization header with Bearer token instead. This parameter will be removed in v3.',
  },
  parameters: {
    docs: {
      description: {
        story: 'A deprecated parameter shows a strikethrough name and a warning "deprecated" badge.',
      },
    },
  },
};

// --- Nested ---

export const Nested: Story = {
  render: () => (
    <div className="max-w-2xl">
      <ParameterField
        name="options"
        type="object"
        required
        description="Configuration options for the request."
      >
        <ParameterField
          name="format"
          type="string"
          description="Response format."
          defaultValue="json"
        />
        <ParameterField
          name="include"
          type="string[]"
          description="Additional fields to include in the response."
        />
        <ParameterField
          name="pagination"
          type="object"
          description="Pagination settings."
        >
          <ParameterField
            name="page"
            type="number"
            description="Page number to retrieve."
            defaultValue="1"
          />
          <ParameterField
            name="perPage"
            type="number"
            description="Number of items per page."
            defaultValue="25"
          />
        </ParameterField>
      </ParameterField>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nested parameters for object types, with support for multiple levels of nesting. Child parameters are indented and connected with a left border.',
      },
    },
  },
};

// --- GroupExample ---

export const GroupExample: Story = {
  render: () => (
    <div className="max-w-2xl space-y-6">
      <ParameterFieldGroup title="Path Parameters">
        <ParameterField
          name="orgId"
          type="string"
          required
          description="The organization identifier."
        />
        <ParameterField
          name="projectId"
          type="string"
          required
          description="The project identifier within the organization."
        />
      </ParameterFieldGroup>

      <ParameterFieldGroup title="Query Parameters">
        <ParameterField
          name="search"
          type="string"
          description="Full-text search query."
        />
        <ParameterField
          name="status"
          type="'active' | 'archived'"
          description="Filter by status."
          defaultValue="active"
        />
        <ParameterField
          name="sort"
          type="string"
          description="Sort field and direction."
          defaultValue="createdAt:desc"
        />
      </ParameterFieldGroup>

      <ParameterFieldGroup title="Request Body">
        <ParameterField
          name="name"
          type="string"
          required
          description="Display name for the resource."
        />
        <ParameterField
          name="description"
          type="string"
          description="Optional description."
        />
        <ParameterField
          name="tags"
          type="string[]"
          description="Tags for categorization."
          defaultValue="[]"
        />
        <ParameterField
          name="legacyId"
          type="string"
          deprecated
          description="Use the new 'externalId' field instead."
        />
      </ParameterFieldGroup>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'ParameterFieldGroup organizes parameters into labeled sections, typical for API documentation with path, query, and body parameter groups.',
      },
    },
  },
};

// --- Mobile ---

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <ParameterFieldGroup title="Parameters">
        <ParameterField
          name="email"
          type="string"
          required
          description="User email address."
        />
        <ParameterField
          name="name"
          type="string"
          description="Display name."
          defaultValue="Anonymous"
        />
        <ParameterField
          name="role"
          type="'admin' | 'member'"
          description="User role assignment."
          deprecated
        />
      </ParameterFieldGroup>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Parameter fields rendered at 375px mobile viewport width, demonstrating responsive wrapping of badges and type annotations.',
      },
    },
  },
};
