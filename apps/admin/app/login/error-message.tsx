'use client'

import { Alert, AlertIcon, Box, type BoxProps } from '@shinju-date/chakra-ui'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState
} from 'react'

export type ErrorMessageValues = {
  message?: string
  setErrorMessage: (message: string) => void
}
export const ErrorMessageContext = createContext<ErrorMessageValues>({
  setErrorMessage: () => undefined
})

export function useErrorMessage(): ErrorMessageValues {
  return useContext(ErrorMessageContext)
}

type ErrorMessageProviderProps = {
  children: ReactNode
  message?: string
}

export function ErrorMessageProvider({
  children,
  message: defaultMessage
}: ErrorMessageProviderProps): JSX.Element {
  const [message, setRawMessage] = useState(() => defaultMessage)

  const setErrorMessage = useCallback((message: string) => {
    setRawMessage(message)
  }, [])

  return (
    <ErrorMessageContext.Provider value={{ message, setErrorMessage }}>
      {children}
    </ErrorMessageContext.Provider>
  )
}

export default function ErrorMessage({
  p,
  ...props
}: BoxProps): JSX.Element | null {
  const { message } = useErrorMessage()

  if (!message) {
    return null
  }

  return (
    <Box p={p ?? 4} {...props}>
      <Alert status="error">
        <AlertIcon />

        {message}
      </Alert>
    </Box>
  )
}
