import { HttpResponse, http } from 'msw'

export const googleFontsHandlers = [
  http.get('https://fonts.googleapis.com/css', async () => {
    return new HttpResponse(null, {
      headers: {
        'Content-Type': 'text/css;charset=utf-8',
      },
    })
  }),
]
