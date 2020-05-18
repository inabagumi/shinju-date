import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

import styles from './Spinner.module.css'

type Props = DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>

const Spinner: FC<Props> = (props) => (
  <span className={styles.spinner} {...props} />
)

export default Spinner
