import preview from '#.storybook/preview'

interface ColorGridProps {
  title: string
  subtitle: string
  colors: Array<{ name: string; value: string }>
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
          <div key={color.name}>
            <div
              style={{
                backgroundColor: color.value,
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                height: '80px',
                marginBottom: '8px',
              }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {color.name}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>{color.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const meta = preview.meta({
  component: ColorGrid,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Design System/Colors',
})

/**
 * # Color Palette
 *
 * This page showcases all color variables defined in `@shinju-date/tailwind-config`.
 */
export const NevyColors = meta.story({
  args: {
    colors: [
      { name: '50', value: '#f2f1ff' },
      { name: '100', value: '#eae5ff' },
      { name: '200', value: '#d5ceff' },
      { name: '300', value: '#b7a7ff' },
      { name: '400', value: '#9676ff' },
      { name: '500', value: '#763fff' },
      { name: '600', value: '#6718ff' },
      { name: '700', value: '#5907fa' },
      { name: '800', value: '#4a05d2' },
      { name: '900', value: '#3e06ac' },
      { name: '950', value: '#1e0064' },
    ],
    subtitle: 'Brand primary color palette',
    title: '774 Nevy Colors',
  },
  name: '774 Nevy Colors',
})

export const PinkColors = meta.story({
  args: {
    colors: [
      { name: '50', value: '#fff0f4' },
      { name: '100', value: '#ffe2ea' },
      { name: '200', value: '#ffcada' },
      { name: '300', value: '#ff9fbb' },
      { name: '400', value: '#ff6999' },
      { name: '500', value: '#ff3278' },
      { name: '600', value: '#ed1166' },
      { name: '700', value: '#c80858' },
      { name: '800', value: '#a80950' },
      { name: '900', value: '#8f0c4a' },
      { name: '950', value: '#500124' },
    ],
    subtitle: 'Secondary brand color palette',
    title: '774 Pink Colors',
  },
  name: '774 Pink Colors',
})

export const BlueColors = meta.story({
  args: {
    colors: [
      { name: '50', value: '#edf7ff' },
      { name: '100', value: '#d6ebff' },
      { name: '200', value: '#b5deff' },
      { name: '300', value: '#83caff' },
      { name: '400', value: '#48acff' },
      { name: '500', value: '#1e87ff' },
      { name: '600', value: '#0665ff' },
      { name: '700', value: '#0050ff' },
      { name: '800', value: '#083ec5' },
      { name: '900', value: '#0d399b' },
      { name: '950', value: '#0e245d' },
    ],
    subtitle: 'Secondary brand color palette',
    title: '774 Blue Colors',
  },
  name: '774 Blue Colors',
})

export const PrimaryColors = meta.story({
  args: {
    colors: [
      { name: 'Primary', value: '#1e0064' },
      { name: 'Primary Foreground', value: '#f2f1ff' },
    ],
    subtitle: 'Main theme colors',
    title: 'Primary Colors',
  },
  name: 'Primary Colors',
})

export const SecondaryPinkColors = meta.story({
  args: {
    colors: [
      { name: 'Secondary Pink', value: '#ff3278' },
      { name: 'Secondary Pink Foreground', value: '#fff0f4' },
    ],
    subtitle: 'Secondary theme color - Pink',
    title: 'Secondary Pink',
  },
  name: 'Secondary Pink Colors',
})

export const SecondaryBlueColors = meta.story({
  args: {
    colors: [
      { name: 'Secondary Blue', value: '#0050ff' },
      { name: 'Secondary Blue Foreground', value: '#edf7ff' },
    ],
    subtitle: 'Secondary theme color - Blue',
    title: 'Secondary Blue',
  },
  name: 'Secondary Blue Colors',
})
