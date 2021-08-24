import { EuiFieldText, EuiFieldTextProps } from "@elastic/eui"
import { Input, InputProps } from "./Input"

export type TextInputProps = InputProps & EuiFieldTextProps

export const TextInput = (props: TextInputProps) => (
  <Input {...props}>{(field) => <EuiFieldText {...field.input} {...props} />}</Input>
)
