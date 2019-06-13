import React, { DetailedHTMLProps, FC, HTMLAttributes } from 'react'

type Props = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const Spinner: FC<Props> = props => {
  return (
    <>
      <div className="spinner" {...props} />

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
          height: 36px;
          margin: 1rem;
          width: 36px;
        }
      `}</style>
    </>
  )
}

export default Spinner
