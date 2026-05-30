import React, { forwardRef, useCallback } from 'react';
import { Switch } from '../Switch';

export type NotificationChannel = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

export type NotificationCategory = {
  id: string;
  title: string;
  description?: string;
  items: {
    id: string;
    label: string;
    description?: string;
    channels: Record<string, boolean>;
  }[];
};

export type NotificationPreferencesProps = React.HTMLAttributes<HTMLDivElement> & {
  channels: NotificationChannel[];
  categories: NotificationCategory[];
  onChange?: (itemId: string, channelId: string, enabled: boolean) => void;
  disabled?: boolean;
};

export const NotificationPreferences = forwardRef<HTMLDivElement, NotificationPreferencesProps>(
  function NotificationPreferences(
    { channels, categories, onChange, disabled = false, className, ...rest },
    ref,
  ) {
    const handleToggle = useCallback(
      (itemId: string, channelId: string, enabled: boolean) => {
        if (disabled) {
          return;
        }
        onChange?.(itemId, channelId, enabled);
      },
      [disabled, onChange],
    );

    const gridCols = `grid-cols-[1fr_repeat(${channels.length},80px)]`;

    return (
      <div
        ref={ref}
        className={[
          'bg-surface rounded-xl ring-1 ring-surface-border/50',
          disabled ? 'opacity-50' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {/* Desktop header */}
        <div
          className={[
            'hidden md:grid items-center px-5 py-3 sticky top-0 bg-surface rounded-t-xl z-10',
            gridCols,
          ].join(' ')}
        >
          <div />
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="text-xs font-semibold text-text-muted uppercase tracking-wider text-center"
            >
              {channel.icon && (
                <span className="inline-flex justify-center mb-1">{channel.icon}</span>
              )}
              <div>{channel.label}</div>
            </div>
          ))}
        </div>

        {categories.map((category, categoryIndex) => (
          <div key={category.id}>
            {/* Category title row */}
            <div
              className={[
                'bg-surface-lighter px-5 py-3 font-semibold text-sm text-text',
                categoryIndex === 0 && channels.length === 0
                  ? ''
                  : 'border-t border-surface-border/50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div>{category.title}</div>
              {category.description && (
                <div className="font-normal text-xs text-text-muted mt-0.5">
                  {category.description}
                </div>
              )}
            </div>

            {/* Item rows */}
            {category.items.map((item) => (
              <div
                key={item.id}
                className="border-t border-surface-border/50 hover:bg-surface-lighter/50 transition-colors"
              >
                {/* Desktop layout */}
                <div className={['hidden md:grid items-center px-5 py-3', gridCols].join(' ')}>
                  <div>
                    <div className="text-sm text-text">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-text-muted mt-0.5">{item.description}</div>
                    )}
                  </div>
                  {channels.map((channel) => (
                    <div key={channel.id} className="flex justify-center">
                      <Switch
                        size="sm"
                        checked={item.channels[channel.id] ?? false}
                        onChange={(enabled) => handleToggle(item.id, channel.id, enabled)}
                        disabled={disabled}
                        aria-label={`${item.label} ${channel.label}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Mobile layout */}
                <div className="md:hidden px-5 py-3">
                  <div className="mb-2">
                    <div className="text-sm text-text">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-text-muted mt-0.5">{item.description}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {channels.map((channel) => (
                      <div key={channel.id} className="flex items-center gap-1.5">
                        <Switch
                          size="sm"
                          checked={item.channels[channel.id] ?? false}
                          onChange={(enabled) => handleToggle(item.id, channel.id, enabled)}
                          disabled={disabled}
                          aria-label={`${item.label} ${channel.label}`}
                        />
                        <span className="text-xs text-text-muted">{channel.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
);

NotificationPreferences.displayName = 'NotificationPreferences';
