import { Form, FormConfig, FormContext, FormErrors, useForm } from "@mozartspa/mobx-form"
import { Observer, observer } from "mobx-react-lite"
import React, { ReactElement, ReactNode } from "react"
import { UseMutationResult } from "react-query"
import { useCreate, useResourceDataProvider } from "../dataProvider"
import { ValidationError } from "../errors"
import { useNotify } from "../notify"
import { RedirectToOptions, RedirectToPage, useRedirect } from "../redirect"
import { ResourceContext, useResource } from "../resource"
import { getRedirectTo, getSuccessMessage } from "./helpers"
import { SaveErrorHandler, SaveSuccessHandler } from "./types"

export type UseCreateFormOptions<TRecord = any, TCreate = TRecord> = Partial<
  Omit<FormConfig<TCreate>, "initialValues">
> & {
  resource?: string
  initialValues?: TCreate
  transform?: (values: TCreate) => any
  redirectTo?:
    | RedirectToPage
    | { to: RedirectToPage; options?: RedirectToOptions }
    | false
  successMessage?: ReactNode | ((record: TRecord) => ReactNode)
  onSaveSuccess?: SaveSuccessHandler<TRecord, TCreate>
  onSaveError?: SaveErrorHandler<TRecord, TCreate>
}

export type UseCreateFormResult<TRecord = any, TCreate = TRecord> = {
  resource: string
  isSaving: boolean
  isSaved: boolean
  form: Form<TCreate>
  mutation: UseMutationResult<TRecord, unknown, TCreate>
}

export function useCreateForm<TRecord = any, TCreate = TRecord>(
  options: UseCreateFormOptions<TRecord, TCreate> = {}
): UseCreateFormResult<TRecord, TCreate> {
  const {
    resource: resourceOpt,
    initialValues,
    transform,
    redirectTo,
    successMessage,
    onSaveSuccess,
    onSaveError,
    ...formOptions
  } = options

  const resource = useResource(resourceOpt)
  const dataProvider = useResourceDataProvider(resource)
  const mutation = useCreate<TRecord, TCreate>({ resource })
  const redirect = useRedirect({ resource })
  const notify = useNotify()

  const handleSubmit = async (values: TCreate): Promise<FormErrors | void> => {
    try {
      // mutate
      const data = transform?.(values) ?? values
      const record = await mutation.mutateAsync(data)
      const id = dataProvider.id(record)

      // default handler
      const handleSuccess = async () => {
        const message = getSuccessMessage(successMessage, record, "Element saved")
        notify(message, { type: "success" })

        const redirectArgs = getRedirectTo(redirectTo ?? "list")

        if (redirectArgs) {
          redirect(redirectArgs.to, {
            id,
            resource: resource,
            ...redirectArgs.options,
          })
        }
      }

      // call custom handler, if any, or the default handler
      if (onSaveSuccess) {
        await onSaveSuccess({ id, record, form }, handleSuccess)
      } else {
        await handleSuccess()
      }

      // no errors returned
      return undefined
    } catch (error) {
      // catch validation errors
      if (error instanceof ValidationError) {
        notify("The form is not valid. Please check for errors", { type: "danger" })
        return error.validationErrors
      }

      // default handler
      const handleError = async () => {
        const message = error instanceof Error ? error.message : String(error)
        notify(message, { type: "danger" })
      }

      // call custom handler, if any, or the default handler
      if (onSaveError) {
        return await onSaveError({ form, error }, handleError)
      } else {
        return await handleError()
      }
    }
  }

  const form = useForm<TCreate>({
    initialValues,
    onSubmit: handleSubmit,
    ...formOptions,
  })

  return {
    resource,
    isSaving: mutation.isLoading,
    isSaved: mutation.isSuccess,
    form,
    mutation,
  }
}

export const CreateFormContext = React.createContext<UseCreateFormResult | undefined>(
  undefined
)

export function useCreateFormContext<TRecord = any, TCreate = TRecord>() {
  const context = React.useContext<UseCreateFormResult<TRecord, TCreate> | undefined>(
    CreateFormContext
  )
  if (!context) {
    throw new Error(`CreateFormContext not found.`)
  }
  return context
}

export type CreateBaseProps<TRecord = any, TCreate = TRecord> = UseCreateFormOptions<
  TRecord,
  TCreate
> & {
  children: ReactNode | ((create: UseCreateFormResult<TRecord, TCreate>) => ReactElement)
}

export const CreateBase = observer((options: CreateBaseProps) => {
  const { children, ...createOptions } = options
  const create = useCreateForm(createOptions)

  const body =
    children instanceof Function ? (
      <Observer>{() => children(create)}</Observer>
    ) : (
      children
    )

  return (
    <ResourceContext.Provider value={create.resource}>
      <CreateFormContext.Provider value={create}>
        <FormContext.Provider value={create.form}>{body}</FormContext.Provider>
      </CreateFormContext.Provider>
    </ResourceContext.Provider>
  )
})
