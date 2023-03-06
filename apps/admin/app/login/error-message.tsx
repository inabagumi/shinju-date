'use client'

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState
} from 'react'
import { Alert, AlertIcon, Box } from '@/lib/chakra-ui'

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

export default function ErrorMessage(): JSX.Element | null {
  const { message } = useErrorMessage()

  if (!message) {
    return null
  }

  return (
    <Box p={4}>
      <Alert status="error">
        <AlertIcon />

        {message}
      </Alert>
    </Box>
  )
}
