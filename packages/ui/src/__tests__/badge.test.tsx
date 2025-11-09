import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';
import { Badge } from '../badge';

describe('Badge', () => {
  test('should render with the correct text', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });
});
