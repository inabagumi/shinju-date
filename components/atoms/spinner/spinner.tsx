import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type Props = DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLDivElement>

const Spinner: FC<Props> = props => {
  return (
    <>
      <span className="spinner" {...props} />

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }

        .spinner {
          animation: spin 0.5s linear infinite;
          border: 4px solid transparent;
          border-bottom-color: #ffc107;
          border-left-color: #03a9f4;
          border-radius: 50%;
          border-right-color: #e91e63;
          border-top-color: #4caf50;
          box-sizing: border-box;
          display: inline-block;
          height: 36px;
          width: 36px;
        }
      `}</style>
    </>
  )
}

export default Spinner
