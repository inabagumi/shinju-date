import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { createImage } from '../testing/images.js'
import { createBlurDataURL } from './blur-data-url.js'

describe('createBlurDataURL', () => {
  it('encodes a 10 pixel wide JPEG as a data URL', async () => {
    const dataURL = await createBlurDataURL(await createImage(320, 180))

    expect(dataURL).toMatch(/^data:image\/jpeg;base64,/)

    const body = Buffer.from(dataURL.split(',')[1] ?? '', 'base64')

    await expect(sharp(body).metadata()).resolves.toMatchObject({
      format: 'jpeg',
      height: 6,
      width: 10,
    })
  })

  it('rejects broken images', async () => {
    await expect(
      createBlurDataURL(new TextEncoder().encode('not an image')),
    ).rejects.toThrow()
  })
})
