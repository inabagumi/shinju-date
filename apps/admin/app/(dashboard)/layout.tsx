import NextLink from 'next/link'
import { ReactNode } from 'react'
import { Box, Flex, Link, SkipNavContent, SkipNavLink } from '@/lib/chakra-ui'
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
          <Flex alignItems="center">
            <Link
              as={NextLink}
              fontSize="2xl"
              fontWeight="bold"
              href="/"
              _hover={{ textDecoration: 'none' }}
            >
              Admin UI
            </Link>
          </Flex>
          <Flex alignItems="center">
            <LogoutButton>ログアウト</LogoutButton>
          </Flex>
        </Flex>
      </Box>
      <SkipNavContent />
      <Box as="main">{children}</Box>
    </>
  )
}
