import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';
import LiveNow from '../live-now';

describe('LiveNow', () => {
  test('should render when status is LIVE', () => {
    render(<LiveNow status="LIVE" />);
    expect(screen.getByText('ライブ配信中')).toBeInTheDocument();
  });

  test('should not render when status is not LIVE', () => {
    const { container } = render(<LiveNow status="UPCOMING" />);
    expect(container).toBeEmptyDOMElement();
  });
});
