import { Container } from '@shinju-date/chakra-ui'

type Params = {
  id: string
}

type Props = {
  params: Params
}

export default function ChannelPage({ params }: Props): JSX.Element {
  return (
    <Container maxW="full" w="container.xl">
      <p>{params.id}</p>
    </Container>
  )
}
