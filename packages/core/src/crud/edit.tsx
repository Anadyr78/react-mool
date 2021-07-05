import { FormConfig, FormContext, useForm, UseFormResult } from "@mozartspa/mobx-form"
import { Observer, observer } from "mobx-react-lite"
import React, { ReactElement, ReactNode, useEffect } from "react"
import { UseMutationResult, UseQueryResult } from "react-query"
import { useParams } from "react-router-dom"
import { RecordID, UpdateParams, useGetOne, useUpdate } from "../dataProvider"
import { ValidationError } from "../errors"
import { ResourceContext, useResource } from "../resource"

function getInitialValues<TRecord = any, TUpdate = TRecord>(
  initialValues: TUpdate | ((record: TRecord) => TUpdate),
  record: TRecord | undefined
) {
  if (initialValues == null) {
    return record as unknown as TUpdate
  }
  if (typeof initialValues === "object") {
    return initialValues
  }
  if (record != null && initialValues instanceof Function) {
    return initialValues(record)
  }
  return record as unknown as TUpdate
}

export type UseEditFormOptions<TRecord = any, TUpdate = TRecord> = Partial<
  Omit<FormConfig<TUpdate>, "initialValues">
> & {
  id?: RecordID
  resource?: string
  initialValues?: TUpdate | ((record: TRecord) => TUpdate)
  transform?: (values: TUpdate) => any
}

export type UseEditFormResult<TRecord = any, TUpdate = TRecord> = {
  id: RecordID
  resource: string
  record: TRecord | undefined
  isLoading: boolean
  isLoaded: boolean
  isSaving: boolean
  form: UseFormResult<TUpdate>
  query: UseQueryResult<TRecord>
  mutation: UseMutationResult<TRecord, unknown, UpdateParams<TUpdate>>
}

export function useEditForm<TRecord = any, TUpdate = any>(
  options: UseEditFormOptions<TRecord, TUpdate> = {}
) {
  const {
    id: idOpt,
    resource: resourceOpt,
    initialValues: initialValuesOpt,
    transform,
    ...formOptions
  } = options

  const resource = useResource(resourceOpt)
  const { id: idParam } = useParams<{ id: string }>()
  const id = idOpt || idParam
  const query = useGetOne<TRecord>(id, { resource })
  const mutation = useUpdate<TRecord, TUpdate>({ resource })

  const initialValues = getInitialValues(initialValuesOpt, query.data)

  const form = useForm<TUpdate>({
    initialValues,
    onSubmit: async (values) => {
      try {
        await mutation.mutateAsync({ id, data: values })
        // TODO: notify and redirect
        console.log("Olè!")
        return undefined
      } catch (err) {
        if (err instanceof ValidationError) {
          return err.validationErrors
        } else {
          // TODO: notify
          throw err
        }
      }
    },
    ...formOptions,
  })

  useEffect(() => {
    // FIXME
    form.reset(getInitialValues(initialValuesOpt, query.data))
  }, [query.data])

  return {
    id,
    resource,
    record: query.data,
    isLoading: query.isLoading,
    isLoaded: query.isFetched,
    isSaving: mutation.isLoading,
    form,
    query,
    mutation,
  }
}

export const EditFormContext = React.createContext<UseEditFormResult | undefined>(
  undefined
)

export function useEditFormContext<TRecord = any, TUpdate = TRecord>() {
  const context = React.useContext<UseEditFormResult<TRecord, TUpdate> | undefined>(
    EditFormContext
  )
  if (!context) {
    throw new Error(`EditFormContext not found.`)
  }
  return context
}

export type EditBaseProps<TRecord = any, TUpdate = TRecord> = UseEditFormOptions<
  TRecord,
  TUpdate
> & {
  children: ReactNode | ((edit: UseEditFormResult<TRecord, TUpdate>) => ReactElement)
}

export const EditBase = observer((options: EditBaseProps) => {
  const { children, ...editOptions } = options
  const edit = useEditForm(editOptions)

  const body =
    children instanceof Function ? <Observer>{() => children(edit)}</Observer> : children

  return (
    <ResourceContext.Provider value={edit.resource}>
      <EditFormContext.Provider value={edit}>
        <FormContext.Provider value={edit.form}>{body}</FormContext.Provider>
      </EditFormContext.Provider>
    </ResourceContext.Provider>
  )
})
