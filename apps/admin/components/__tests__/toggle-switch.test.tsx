import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test } from 'vitest';
import ToggleSwitch from '../toggle-switch';

describe('ToggleSwitch', () => {
  test('should render with the correct label', () => {
    render(<ToggleSwitch checked={false} label="Test Switch" />);
    expect(screen.getByLabelText('Test Switch')).toBeInTheDocument();
  });
});
