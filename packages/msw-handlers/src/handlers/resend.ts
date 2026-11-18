import { HttpResponse, http } from "msw";

export const resendHandlers = [
  http.post("https://api.resend.com/emails", () =>
    HttpResponse.json({
      id: "re_123456789",
    })
  ),
];
