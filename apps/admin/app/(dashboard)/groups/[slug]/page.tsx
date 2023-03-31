import { Container } from '@shinju-date/chakra-ui'

// TODO: https://github.com/vercel/next.js/issues/43458
// export const runtime = 'edge'

type Params = {
  slug: string
}

type Props = {
  params: Params
}

export default function GroupPage({ params }: Props): JSX.Element {
  return (
    <Container maxW="full" w="container.xl">
      <p>{params.slug}</p>
    </Container>
  )
}
