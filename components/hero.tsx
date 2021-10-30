import Image from 'next/image'
import Logo from '../assets/logo.svg'
import hero from '../assets/hero.jpg'
import styles from './hero.module.css'
import type { VFC } from 'react'

const Hero: VFC = () => {
  return (
    <div className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>
          <Logo
            aria-label="SHINJU DATE"
            className={styles.logo}
            height={80}
            role="img"
            width={256}
          />
        </h1>
      </div>

      <div className={styles.heroImage}>
        <Image alt="" priority role="presentation" src={hero} />
      </div>
    </div>
  )
}

export default Hero
