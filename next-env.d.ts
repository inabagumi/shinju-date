/// <reference types="next" />
/// <reference types="next/types/global" />

declare module '*.jpeg'
declare module '*.jpg'
declare module '*.png'

declare module '*.svg' {
  import { FC, ReactSVGElement, SVGProps } from 'react'

  type Props = SVGProps<SVGSVGElement>
  const content: FC<Props>

  export default content
}

/**
 * https://w3c.github.io/manifest/#dom-textdirectiontype
 */
type TextDirectionType = 'ltr' | 'rtl' | 'auto'

/**
 * https://w3c.github.io/manifest/#dom-displaymodetype
 */
type DisplayModeType = 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'

/**
 * https://w3c.github.io/manifest/#dom-imageresource
 */
interface ImageResource {
  src: string
  sizes?: string
  type?: string
  purpose?: string
  platform?: string
}

/**
 * https://w3c.github.io/manifest/#dom-fingerprint
 */
interface Fingerprint {
  type?: string
  value?: string
}

/**
 * https://w3c.github.io/manifest/#dom-externalapplicationresource
 */
interface ExternalApplicationResource {
  platform: string
  url?: string
  id?: string
  min_version?: string
  fingerprints?: Array<Fingerprint>
}

/**
 * https://w3c.github.io/manifest/#dom-shortcutitem
 */
interface ShortcutItem {
  name: string
  short_name?: string
  description?: string
  url: string
  icons?: Array<ImageResource>
}

/**
 * https://w3c.github.io/manifest/#dom-webappmanifest
 */
interface WebAppManifest {
  dir?: TextDirectionType
  lang?: string
  name?: string
  short_name?: string
  description?: string
  icons?: Array<ImageResource>
  screenshots?: Array<ImageResource>
  categories?: Array<string>
  iarc_rating_id?: string
  start_url?: string
  display?: DisplayModeType
  orientation?: OrientationLockType
  theme_color?: string
  background_color?: string
  scope?: string
  related_applications?: Array<ExternalApplicationResource>
  prefer_related_applications?: boolean
  shortcuts?: Array<T>
}
