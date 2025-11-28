import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Design System/Colors',
}

export default meta

type Story = StoryObj

interface ColorSwatchProps {
  name: string
  variable: string
}

function ColorSwatch({ name, variable }: ColorSwatchProps) {
  return (
    <div>
      <div
        style={{
          backgroundColor: `var(${variable})`,
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          height: '80px',
          marginBottom: '8px',
        }}
      />
      <div style={{ fontSize: '14px', fontWeight: 600 }}>{name}</div>
      <div style={{ color: '#666', fontSize: '12px' }}>{variable}</div>
    </div>
  )
}

interface ColorGridProps {
  title: string
  subtitle: string
  colors: Array<{ name: string; variable: string }>
}

function ColorGrid({ title, subtitle, colors }: ColorGridProps) {
  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{title}</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>{subtitle}</p>
      <div
        style={{
          display: 'grid',
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}
      >
        {colors.map((color) => (
          <ColorSwatch
            key={color.variable}
            name={color.name}
            variable={color.variable}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * # Color Palette
 *
 * This page showcases all color variables defined in `@shinju-date/tailwind-config`.
 */
export const NevyColors: Story = {
  name: '774 Nevy Colors',
  render: () => (
    <ColorGrid
      colors={[
        { name: '50', variable: '--color-774-nevy-50' },
        { name: '100', variable: '--color-774-nevy-100' },
        { name: '200', variable: '--color-774-nevy-200' },
        { name: '300', variable: '--color-774-nevy-300' },
        { name: '400', variable: '--color-774-nevy-400' },
        { name: '500', variable: '--color-774-nevy-500' },
        { name: '600', variable: '--color-774-nevy-600' },
        { name: '700', variable: '--color-774-nevy-700' },
        { name: '800', variable: '--color-774-nevy-800' },
        { name: '900', variable: '--color-774-nevy-900' },
        { name: '950', variable: '--color-774-nevy-950' },
      ]}
      subtitle="Brand primary color palette"
      title="774 Nevy Colors"
    />
  ),
}

export const PinkColors: Story = {
  name: '774 Pink Colors',
  render: () => (
    <ColorGrid
      colors={[
        { name: '50', variable: '--color-774-pink-50' },
        { name: '100', variable: '--color-774-pink-100' },
        { name: '200', variable: '--color-774-pink-200' },
        { name: '300', variable: '--color-774-pink-300' },
        { name: '400', variable: '--color-774-pink-400' },
        { name: '500', variable: '--color-774-pink-500' },
        { name: '600', variable: '--color-774-pink-600' },
        { name: '700', variable: '--color-774-pink-700' },
        { name: '800', variable: '--color-774-pink-800' },
        { name: '900', variable: '--color-774-pink-900' },
        { name: '950', variable: '--color-774-pink-950' },
      ]}
      subtitle="Secondary brand color palette"
      title="774 Pink Colors"
    />
  ),
}

export const BlueColors: Story = {
  name: '774 Blue Colors',
  render: () => (
    <ColorGrid
      colors={[
        { name: '50', variable: '--color-774-blue-50' },
        { name: '100', variable: '--color-774-blue-100' },
        { name: '200', variable: '--color-774-blue-200' },
        { name: '300', variable: '--color-774-blue-300' },
        { name: '400', variable: '--color-774-blue-400' },
        { name: '500', variable: '--color-774-blue-500' },
        { name: '600', variable: '--color-774-blue-600' },
        { name: '700', variable: '--color-774-blue-700' },
        { name: '800', variable: '--color-774-blue-800' },
        { name: '900', variable: '--color-774-blue-900' },
        { name: '950', variable: '--color-774-blue-950' },
      ]}
      subtitle="Secondary brand color palette"
      title="774 Blue Colors"
    />
  ),
}

export const PrimaryColors: Story = {
  name: 'Primary Colors',
  render: () => (
    <ColorGrid
      colors={[
        { name: 'Primary', variable: '--color-primary' },
        { name: 'Primary Foreground', variable: '--color-primary-foreground' },
      ]}
      subtitle="Main theme colors"
      title="Primary Colors"
    />
  ),
}

export const SecondaryColors: Story = {
  name: 'Secondary Colors',
  render: () => (
    <div>
      <ColorGrid
        colors={[
          { name: 'Secondary Pink', variable: '--color-secondary-pink' },
          {
            name: 'Secondary Pink Foreground',
            variable: '--color-secondary-pink-foreground',
          },
        ]}
        subtitle="Secondary theme color - Pink"
        title="Secondary Pink"
      />
      <ColorGrid
        colors={[
          { name: 'Secondary Blue', variable: '--color-secondary-blue' },
          {
            name: 'Secondary Blue Foreground',
            variable: '--color-secondary-blue-foreground',
          },
        ]}
        subtitle="Secondary theme color - Blue"
        title="Secondary Blue"
      />
    </div>
  ),
}
