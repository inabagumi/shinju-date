export const runtime = 'edge'

export default function Home(): JSX.Element {
  return (
    <>
      <h1>Home</h1>

      <form action="/logout" method="post">
        <button type="submit">Logout</button>
      </form>
    </>
  )
}
