import type { ComponentProps } from 'react';
import { viewHref, type View } from '../hooks/useView';

type ViewLinkProps = Omit<ComponentProps<'a'>, 'href' | 'onClick'> & {
  view: View;
  onNavigate: (view: View) => void;
};

/** A real link to a dashboard screen that switches in place; ctrl/cmd-click still opens a new tab. */
export default function ViewLink({ view, onNavigate, ...props }: ViewLinkProps) {
  return (
    <a
      {...props}
      href={viewHref(view)}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        onNavigate(view);
      }}
    />
  );
}
