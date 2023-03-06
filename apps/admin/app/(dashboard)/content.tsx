'use client'

import { Box, Button, Container, Heading } from '@chakra-ui/react'

export default function DashboardContent(): JSX.Element {
  return (
    <Container maxW="container.lg">
      <Heading as="h1" size="lg">
        Admin UI
      </Heading>

      <Box
        action="/logout"
        as="form"
        display="flex"
        justifyContent="flex-end"
        method="post"
        mt={12}
      >
        <Button type="submit">ログアウト</Button>
      </Box>
    </Container>
  )
}
