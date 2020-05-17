import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

import styles from './spinner.module.css'

type Props = DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLDivElement>

const Spinner: FC<Props> = (props) => (
  <span className={styles.spinner} {...props} />
)

export default Spinner
