import React, { createContext, forwardRef, useContext } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type StepperSize = 'sm' | 'md' | 'lg';
export type StepperOrientation = 'horizontal' | 'vertical';

export type StepperProps = React.HTMLAttributes<HTMLDivElement> & {
  activeStep: number;
  orientation?: StepperOrientation;
  size?: StepperSize;
  children: React.ReactNode;
};

export type StepperStepProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  optional?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Internal context                                                  */
/* ------------------------------------------------------------------ */

type StepContext = {
  index: number;
  activeStep: number;
  totalSteps: number;
  orientation: StepperOrientation;
  size: StepperSize;
};

const StepCtx = createContext<StepContext>({
  index: 0,
  activeStep: 0,
  totalSteps: 0,
  orientation: 'horizontal',
  size: 'md',
});

/* ------------------------------------------------------------------ */
/*  Size tokens                                                       */
/* ------------------------------------------------------------------ */

const circleSize: Record<StepperSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
};

const titleSize: Record<StepperSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const descriptionSize: Record<StepperSize, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

/* ------------------------------------------------------------------ */
/*  Checkmark SVG                                                     */
/* ------------------------------------------------------------------ */

const CheckIcon: React.FC = () => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className="w-[55%] h-[55%]"
  >
    <path
      d="M6 10.5L8.5 13L14 7"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  StepperStep                                                       */
/* ------------------------------------------------------------------ */

export const StepperStep = forwardRef<HTMLDivElement, StepperStepProps>(
  function StepperStep({ title, description, icon, optional }, ref) {
    const { index, activeStep, totalSteps, orientation, size } = useContext(StepCtx);

    const isCompleted = index < activeStep;
    const isActive = index === activeStep;
    const isLast = index === totalSteps - 1;

    /* Circle classes */
    const circleBase = [
      'flex items-center justify-center rounded-full font-semibold shrink-0 transition-all duration-200',
      circleSize[size],
    ];

    let circleClasses: string;
    if (isCompleted) {
      circleClasses = [
        ...circleBase,
        'bg-success text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
      ].join(' ');
    } else if (isActive) {
      circleClasses = [
        ...circleBase,
        'bg-primary text-white ring-4 ring-primary/20',
      ].join(' ');
    } else {
      circleClasses = [
        ...circleBase,
        'bg-surface-lighter text-text-tertiary',
      ].join(' ');
    }

    /* Connector line */
    const connectorLine = !isLast ? (
      <div
        className={[
          'transition-colors duration-200',
          orientation === 'horizontal'
            ? ['flex-1 h-0.5 mx-2 self-center', isCompleted ? 'bg-success' : 'border-t-2 border-dashed border-surface-border bg-transparent'].join(' ')
            : ['w-0.5 flex-1 my-1', isCompleted ? 'bg-success' : 'border-l-2 border-dashed border-surface-border bg-transparent'].join(' '),
        ].join(' ')}
        aria-hidden="true"
      />
    ) : null;

    /* Circle content */
    const circleContent = isCompleted ? (
      <CheckIcon />
    ) : icon ? (
      icon
    ) : (
      <span>{index + 1}</span>
    );

    /* Horizontal layout */
    if (orientation === 'horizontal') {
      return (
        <>
          <div
            ref={ref}
            className="flex flex-col items-center gap-1.5 min-w-0"
            data-step={index}
            data-state={isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}
          >
            <div className={circleClasses}>{circleContent}</div>
            <div className="flex flex-col items-center text-center min-w-0">
              <span
                className={[
                  'font-medium leading-tight',
                  titleSize[size],
                  isActive ? 'text-text-strong' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary',
                ].join(' ')}
              >
                {title}
              </span>
              {description && (
                <span
                  className={[
                    'mt-0.5 text-text-tertiary leading-tight',
                    descriptionSize[size],
                  ].join(' ')}
                >
                  {description}
                </span>
              )}
              {optional && (
                <span
                  className={[
                    'mt-0.5 italic text-text-tertiary',
                    descriptionSize[size],
                  ].join(' ')}
                >
                  Optional
                </span>
              )}
            </div>
          </div>
          {connectorLine}
        </>
      );
    }

    /* Vertical layout */
    return (
      <div
        ref={ref}
        className="flex gap-3 min-w-0"
        data-step={index}
        data-state={isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}
      >
        {/* Left rail: circle + vertical line */}
        <div className="flex flex-col items-center">
          <div className={circleClasses}>{circleContent}</div>
          {connectorLine}
        </div>
        {/* Right: labels */}
        <div className={['flex flex-col min-w-0', !isLast ? 'pb-6' : ''].filter(Boolean).join(' ')}>
          <span
            className={[
              'font-medium leading-tight',
              titleSize[size],
              isActive ? 'text-text-strong' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary',
            ].join(' ')}
          >
            {title}
          </span>
          {description && (
            <span
              className={[
                'mt-0.5 text-text-tertiary leading-tight',
                descriptionSize[size],
              ].join(' ')}
            >
              {description}
            </span>
          )}
          {optional && (
            <span
              className={[
                'mt-0.5 italic text-text-tertiary',
                descriptionSize[size],
              ].join(' ')}
            >
              Optional
            </span>
          )}
        </div>
      </div>
    );
  },
);

StepperStep.displayName = 'StepperStep';

/* ------------------------------------------------------------------ */
/*  Stepper                                                           */
/* ------------------------------------------------------------------ */

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(function Stepper(
  {
    activeStep,
    orientation = 'horizontal',
    size = 'md',
    children,
    className,
    ...rest
  },
  ref,
) {
  const steps = React.Children.toArray(children);
  const totalSteps = steps.length;

  return (
    <div
      ref={ref}
      className={[
        orientation === 'horizontal'
          ? 'flex items-start w-full'
          : 'flex flex-col w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label="Progress steps"
      {...rest}
    >
      {steps.map((child, i) => (
        <StepCtx.Provider
          key={i}
          value={{ index: i, activeStep, totalSteps, orientation, size }}
        >
          {child}
        </StepCtx.Provider>
      ))}
    </div>
  );
});

Stepper.displayName = 'Stepper';
