import NextLink from 'next/link'
import { ReactNode } from 'react'
import { Box, Flex, Link, SkipNavLink } from '@/lib/chakra-ui'
import LogoutButton from './logout-button'

export type Props = {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props): JSX.Element {
  return (
    <>
      <SkipNavLink>コンテンツにスキップ</SkipNavLink>

      <Box as="header" borderBottomWidth={1} p={2} pos="sticky">
        <Flex justify="space-between">
          <Box>
            <Link
              as={NextLink}
              fontSize="xl"
              fontWeight="bold"
              href="/"
              _hover={{ textDecoration: 'none' }}
            >
              Admin UI
            </Link>
          </Box>
          <Box>
            <LogoutButton>ログアウト</LogoutButton>
          </Box>
        </Flex>
      </Box>
      <Box>{children}</Box>
    </>
  )
}
