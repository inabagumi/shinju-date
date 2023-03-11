import * as yup from 'yup'

const loginFormDataSchema = yup.object().shape({
  email: yup.string().email().required(),
  password: yup.string().min(8).required()
})

export default loginFormDataSchema
export type LoginFormData = yup.InferType<typeof loginFormDataSchema>
