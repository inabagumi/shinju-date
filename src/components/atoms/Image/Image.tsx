import clsx from 'clsx'
import React, {
  ForwardRefRenderFunction,
  ImgHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useState
} from 'react'

import styles from './Image.module.css'

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  preSrc: string
}

const Image: ForwardRefRenderFunction<HTMLImageElement, Props> = (
  { className, preSrc, src, srcSet, ...props },
  ref
) => {
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
  }, [])

  useEffect(() => {
    setIsLoading(true)
  }, [src, srcSet])

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      onLoad={handleLoad}
      className={clsx(styles.image, className, {
        [styles.imageLoading]: isLoading
      })}
      ref={ref}
      src={src}
      srcSet={srcSet}
      style={{ backgroundImage: `url('${preSrc}')` }}
      {...props}
    />
  )
}

export default forwardRef(Image)
