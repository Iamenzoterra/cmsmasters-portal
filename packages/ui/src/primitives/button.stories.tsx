import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'cta'],
    },
    size: {
      control: 'select',
      options: ['mini', 'sm', 'default', 'lg', 'xl'],
    },
    roundness: {
      control: 'select',
      options: ['default', 'pill'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'default',
    roundness: 'default',
    loading: false,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── Variants ────────────────────────────────────────────────────────────────

export const Primary: Story = {
  args: { variant: 'primary' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Destructive: Story = {
  args: { variant: 'destructive' },
};

export const CTA: Story = {
  args: { variant: 'cta' },
};

// ─── Sizes ───────────────────────────────────────────────────────────────────

export const Mini: Story = {
  args: { size: 'mini' },
};

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};

export const ExtraLarge: Story = {
  args: { size: 'xl' },
};

// ─── Roundness ───────────────────────────────────────────────────────────────

export const Pill: Story = {
  args: { roundness: 'pill' },
};

export const PillOutline: Story = {
  args: { variant: 'outline', roundness: 'pill' },
};

// ─── States ──────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: { loading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const LoadingSecondary: Story = {
  args: { variant: 'secondary', loading: true },
};

// ─── Variant × Size Matrix ──────────────────────────────────────────────────

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['primary', 'secondary', 'outline', 'ghost', 'destructive', 'cta'] as const).map(
        (variant) => (
          <div key={variant} className="flex items-center gap-3">
            <span className="w-24 text-sm font-mono text-zinc-500">{variant}</span>
            {(['mini', 'sm', 'default', 'lg', 'xl'] as const).map((size) => (
              <Button key={`${variant}-${size}`} variant={variant} size={size}>
                {size}
              </Button>
            ))}
          </div>
        ),
      )}
    </div>
  ),
};

export const AllRoundness: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <Button roundness="default" size="lg">Default</Button>
      <Button roundness="pill" size="lg">Pill</Button>
      <Button variant="outline" roundness="default" size="lg">Outline</Button>
      <Button variant="outline" roundness="pill" size="lg">Pill Outline</Button>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <Button>Default</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
};
