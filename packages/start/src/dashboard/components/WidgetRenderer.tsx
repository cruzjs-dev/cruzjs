import { StatWidget } from './widgets/StatWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { ListWidget } from './widgets/ListWidget';
import { FeedWidget } from './widgets/FeedWidget';

interface WidgetRendererProps {
  widget: {
    id: string;
    type: string;
    title: string;
    config: Record<string, unknown>;
  };
}

/**
 * WidgetRenderer
 *
 * Dispatches widget rendering to the appropriate widget component
 * based on widget.type (STAT, CHART, LIST, FEED).
 */
export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget }) => {
  switch (widget.type) {
    case 'STAT':
      return <StatWidget title={widget.title} config={widget.config} />;
    case 'CHART':
      return <ChartWidget title={widget.title} config={widget.config} />;
    case 'LIST':
      return <ListWidget title={widget.title} config={widget.config} />;
    case 'FEED':
      return <FeedWidget title={widget.title} config={widget.config} />;
    default:
      return null;
  }
};
