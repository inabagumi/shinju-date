import React, { FC } from 'react'

const Footer: FC = () => {
  return (
    <>
      <footer className="footer">
        <p className="copyright">
          Copyright 2019{' '}
          <a
            href="https://haneru.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Haneru Developers
          </a>
        </p>
      </footer>

      <style jsx>{`
        .footer {
          background-color: #212121;
          color: #fafafa;
        }

        .copyright {
          font-size: 0.9rem;
          margin: 2rem 0.5rem;
          text-align: center;
        }

        .copyright a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>
    </>
  )
}

export default Footer
