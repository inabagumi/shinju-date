import * as yup from 'yup'

export const loginFormDataSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().min(8).required()
})

export const sessionSchema = yup.object().shape({
  access_token: yup.string().min(1).required(),
  refresh_token: yup.string().min(1).required()
})
