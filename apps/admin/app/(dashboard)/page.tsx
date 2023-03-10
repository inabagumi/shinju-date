import {
  Container,
  Heading,
  Link,
  ListItem,
  UnorderedList
} from '@shinju-date/chakra-ui'
import NextLink from 'next/link'

// export const runtime = 'edge'

export default function Dashboard(): JSX.Element {
  return (
    <Container maxW="100%" w="container.xl">
      <Heading as="h1">Home</Heading>

      <UnorderedList>
        <ListItem>
          <Link as={NextLink} color="blue.500" href="/groups">
            グループ一覧
          </Link>
        </ListItem>
        <ListItem>
          <Link as={NextLink} color="blue.500" href="/channels">
            チャンネル一覧
          </Link>
        </ListItem>
      </UnorderedList>
    </Container>
  )
}
