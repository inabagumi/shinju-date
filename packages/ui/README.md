# Shared UI Components for SHINJU DATE

This package contains shared UI components used across SHINJU DATE applications.

## Components

- **Button**: A versatile button component with multiple variants
- **Input**: Form input component with consistent styling
- **Dialog**: Modal dialog component built on Radix UI
- **Card**: Container component for content

## Usage

```tsx
import { Button, Input, Dialog, Card } from '@shinju-date/ui'
import '@shinju-date/ui/styles.css'

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text..." />
      <Button variant="primary">Submit</Button>
    </Card>
  )
}
```

## Development

```bash
# Build the package
pnpm run build

# Watch mode for development
pnpm run dev
```
