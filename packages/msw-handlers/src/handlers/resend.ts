import { HttpResponse, http } from 'msw'

export const resendHandlers = [
  http.post('https://api.resend.com/emails', async () => {
    return HttpResponse.json({
      id: 're_123456789',
    })
  }),
]
