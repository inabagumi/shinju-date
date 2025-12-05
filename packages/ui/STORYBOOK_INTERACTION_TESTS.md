# Storybook Interaction Tests with Play Functions

This document explains how interaction tests are implemented in the UI package using Storybook's Play functions.

## Overview

Storybook Play functions allow us to write automated interaction tests that run directly in Storybook. These tests simulate user interactions (clicks, typing, etc.) and verify that components behave correctly.

## Benefits

- **Visual Feedback**: Tests run in the Storybook UI, allowing you to see the interactions in real-time
- **Automatic Testing**: Tests run in CI/CD pipelines as part of the E2E test suite
- **Better Developer Experience**: No need to switch between Storybook and separate test files
- **Real UI Behavior**: Tests interact with actual rendered components in a browser environment

## Technologies Used

- **@storybook/test**: Provides testing utilities (`expect`, `userEvent`, `within`, `waitFor`)
- **Vitest**: Test runner for executing Storybook tests
- **Playwright**: Browser automation for running tests in a real browser

## Examples

### Button Component

```typescript
import { expect, userEvent, within } from 'storybook/test'

export const Primary = meta.story({
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /primary button/i })

    // Verify button is rendered
    await expect(button).toBeInTheDocument()

    // Test click interaction
    await userEvent.click(button)

    // Verify button is still visible after click
    await expect(button).toBeInTheDocument()
  },
})
```

### Input Component

```typescript
export const Default = meta.story({
  args: {
    placeholder: 'Enter text...',
    variant: 'default',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByPlaceholderText(/enter text/i)

    // Verify input is rendered
    await expect(input).toBeInTheDocument()

    // Test typing interaction
    await userEvent.type(input, 'Hello, Storybook!')

    // Verify the typed value
    await expect(input).toHaveValue('Hello, Storybook!')

    // Clear the input
    await userEvent.clear(input)

    // Verify input is cleared
    await expect(input).toHaveValue('')
  },
})
```

### Dialog Component (Complex Interaction)

```typescript
export const Basic = meta.story({
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Find and click the trigger button
    const triggerButton = canvas.getByRole('button', { name: /open dialog/i })
    await userEvent.click(triggerButton)

    // Wait for dialog to appear (using document.body since dialog is portaled)
    await waitFor(async () => {
      const dialog = await within(document.body).findByRole('dialog')
      await expect(dialog).toBeInTheDocument()
    })

    // Verify dialog content
    const dialogTitle = within(document.body).getByText(/dialog title/i)
    await expect(dialogTitle).toBeInTheDocument()

    // Find and click close button
    const closeButton = within(document.body).getByRole('button', {
      name: /close/i,
    })
    await userEvent.click(closeButton)

    // Wait for dialog to close
    await waitFor(() => {
      const dialog = within(document.body).queryByRole('dialog')
      expect(dialog).not.toBeInTheDocument()
    })
  },
  render: () => (/* component JSX */),
})
```

### MultiSelect Component

```typescript
export const Default = meta.story({
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Open the popover
    const trigger = canvas.getByRole('button', { name: /select options/i })
    await userEvent.click(trigger)

    // Wait for popover to appear
    await waitFor(() => {
      const option1 = within(document.body).getByLabelText(/option 1/i)
      expect(option1).toBeInTheDocument()
    })

    // Select multiple options
    const option1 = within(document.body).getByLabelText(/option 1/i)
    await userEvent.click(option1)
    await expect(option1).toBeChecked()

    const option2 = within(document.body).getByLabelText(/option 2/i)
    await userEvent.click(option2)
    await expect(option2).toBeChecked()

    // Verify display updates
    await waitFor(() => {
      const displayText = canvas.getByText(/2件選択中/i)
      expect(displayText).toBeInTheDocument()
    })
  },
  render: (args) => <MultiSelectWithState {...args} />,
})
```

## Running Tests

### Development

View tests in Storybook UI:

```bash
pnpm storybook
```

Then navigate to a story with a Play function and click the "Play" button in the Interactions panel.

### CLI

Run all Storybook interaction tests:

```bash
pnpm test:e2e
```

This command:
1. Builds Storybook
2. Starts a browser (Chromium via Playwright)
3. Runs all Play functions as tests
4. Reports results

### CI

Tests automatically run in GitHub Actions as part of the E2E test suite:

- Job: `e2e` → `@shinju-date/ui`
- Runs on: Pull requests and main branch pushes
- Browser: Chromium (headless)
- Reports uploaded as artifacts on failure

## Best Practices

1. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText`, `getByPlaceholderText` over `getByTestId`
2. **Wait for Async Changes**: Use `waitFor` when elements appear/disappear asynchronously
3. **Portal Components**: Use `within(document.body)` for components that render to portals (Dialog, Popover, etc.)
4. **Clear Test Intent**: Add comments explaining what each interaction tests
5. **Test User Flows**: Focus on realistic user interactions, not implementation details
6. **Keep Tests Independent**: Each Play function should be self-contained

## Components with Play Functions

Currently, the following components have Play function tests:

- **Button**: Click interaction, disabled state verification
- **Input**: Typing text, clearing input, disabled state
- **Dialog**: Opening/closing dialog, form submission flow
- **MultiSelect**: Selecting/deselecting options, "Select All" functionality

## Future Enhancements

- Add Play functions to remaining components (Toast, Card, Badge, Textarea)
- Implement accessibility testing in Play functions
- Add visual regression testing integration
- Create more complex user flow scenarios

## References

- [Storybook Play Function Documentation](https://storybook.js.org/docs/writing-stories/play-function)
- [Storybook Test Package](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
