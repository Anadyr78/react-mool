import { EuiFormRow } from "@elastic/eui"
import {
  Field,
  FieldComponentProps,
  FieldRenderProps,
  splitFieldProps,
} from "@mozartspa/mobx-form"
import { useTranslate } from "@react-mool/core"
import { ReactNode } from "react"
import { errorMessages } from "../error"
import { useGetResourceFieldLabel } from "../helpers"

type ChildrenProps<T> = Omit<T, keyof InputProps>

export type InputProps = FieldComponentProps & {
  label?: ReactNode | false
  fullWidth?: boolean
  helpText?: ReactNode | ReactNode[]
}

export type InputComponentProps<TCustomProps = Object> = InputProps &
  TCustomProps & {
    children: (
      field: FieldRenderProps,
      childrenProps: ChildrenProps<TCustomProps>
    ) => ReactNode
  }

export const Input = <TCustomProps extends Object>(
  props: InputComponentProps<TCustomProps>
) => {
  const { label, fullWidth, helpText, children, ...rest } = props

  const [name, fieldOptions, childrenProps] = splitFieldProps(rest)
  const getFieldLabel = useGetResourceFieldLabel()
  const translate = useTranslate()

  return (
    <Field {...fieldOptions} name={name}>
      {(field) => {
        const content = <>{children(field, childrenProps as any /* FIX $TYPE*/)}</>
        if (label === false) {
          return content
        } else {
          const inputLabel = label ? translate(label) : getFieldLabel(field.name)
          const isInvalid = field.isTouched && !field.isValid
          const errors = isInvalid ? errorMessages(field.errors) : undefined
          return (
            <EuiFormRow
              label={inputLabel}
              isInvalid={isInvalid}
              error={errors}
              fullWidth={fullWidth}
              helpText={translate(helpText)}
            >
              {content}
            </EuiFormRow>
          )
        }
      }}
    </Field>
  )
}
