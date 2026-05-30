import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stepper, StepperStep } from './Stepper';

describe('Stepper', () => {
  it('renders all steps', () => {
    render(
      <Stepper activeStep={0}>
        <StepperStep title="First" />
        <StepperStep title="Second" />
        <StepperStep title="Third" />
      </Stepper>,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('renders with role list for accessibility', () => {
    render(
      <Stepper activeStep={0}>
        <StepperStep title="Step 1" />
      </Stepper>,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('marks active step with data-state="active"', () => {
    const { container } = render(
      <Stepper activeStep={1}>
        <StepperStep title="First" />
        <StepperStep title="Second" />
        <StepperStep title="Third" />
      </Stepper>,
    );
    const activeStep = container.querySelector('[data-state="active"]');
    expect(activeStep).toBeInTheDocument();
    expect(activeStep?.getAttribute('data-step')).toBe('1');
  });

  it('marks completed steps with data-state="completed"', () => {
    const { container } = render(
      <Stepper activeStep={2}>
        <StepperStep title="First" />
        <StepperStep title="Second" />
        <StepperStep title="Third" />
      </Stepper>,
    );
    const completedSteps = container.querySelectorAll('[data-state="completed"]');
    expect(completedSteps).toHaveLength(2);
  });

  it('marks upcoming steps with data-state="upcoming"', () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <StepperStep title="First" />
        <StepperStep title="Second" />
        <StepperStep title="Third" />
      </Stepper>,
    );
    const upcomingSteps = container.querySelectorAll('[data-state="upcoming"]');
    expect(upcomingSteps).toHaveLength(2);
  });

  it('renders step descriptions', () => {
    render(
      <Stepper activeStep={0}>
        <StepperStep title="Account" description="Create your account" />
        <StepperStep title="Profile" description="Set up profile" />
      </Stepper>,
    );
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText('Set up profile')).toBeInTheDocument();
  });

  it('renders optional label when optional prop is set', () => {
    render(
      <Stepper activeStep={0}>
        <StepperStep title="Required" />
        <StepperStep title="Extra" optional />
      </Stepper>,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });

  it('renders step numbers for non-completed steps', () => {
    render(
      <Stepper activeStep={0}>
        <StepperStep title="First" />
        <StepperStep title="Second" />
      </Stepper>,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders checkmark SVG for completed steps instead of number', () => {
    const { container } = render(
      <Stepper activeStep={2}>
        <StepperStep title="First" />
        <StepperStep title="Second" />
        <StepperStep title="Third" />
      </Stepper>,
    );
    const completedSteps = container.querySelectorAll('[data-state="completed"]');
    completedSteps.forEach((step) => {
      const svg = step.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
    // Active step should show number, not SVG
    const activeStep = container.querySelector('[data-state="active"]');
    expect(activeStep?.querySelector('svg')).toBeNull();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies custom className to the container', () => {
    const { container } = render(
      <Stepper activeStep={0} className="my-custom-class">
        <StepperStep title="Step" />
      </Stepper>,
    );
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });

  it('renders in vertical orientation', () => {
    const { container } = render(
      <Stepper activeStep={1} orientation="vertical">
        <StepperStep title="First" />
        <StepperStep title="Second" />
        <StepperStep title="Third" />
      </Stepper>,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('flex-col');
  });

  it('renders completed step circle with bg-success class', () => {
    const { container } = render(
      <Stepper activeStep={1}>
        <StepperStep title="Done" />
        <StepperStep title="Current" />
      </Stepper>,
    );
    const completedStep = container.querySelector('[data-state="completed"]');
    const circle = completedStep?.querySelector('.bg-success');
    expect(circle).toBeInTheDocument();
  });

  it('renders active step circle with bg-primary class', () => {
    const { container } = render(
      <Stepper activeStep={0}>
        <StepperStep title="Current" />
        <StepperStep title="Next" />
      </Stepper>,
    );
    const activeStep = container.querySelector('[data-state="active"]');
    const circle = activeStep?.querySelector('.bg-primary');
    expect(circle).toBeInTheDocument();
  });
});
