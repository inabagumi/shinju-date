import addonDocs from '@storybook/addon-docs'
import { definePreview } from '@storybook/react-vite'
import '../src/styles.css'

export default definePreview({
  addons: [addonDocs()],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
})
