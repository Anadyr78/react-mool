import { I18nProvider, ResourceContext } from "@react-mool/core"
import { Admin } from "@react-mool/eui"
import { useEffect, useState } from "react"
import { Route, Switch } from "react-router-dom"
import { dataProvider } from "./dataProvider"
import { polyglotI18nProviderAsync } from "./i18n/i18nProvider"
import { Layout } from "./layout/Layout"
import { ProductCreate, ProductDetail, ProductList, ProductUpdate } from "./products"

function App() {
  const [i18nProvider, setI18nProvider] = useState<I18nProvider | undefined>(undefined)

  useEffect(() => {
    polyglotI18nProviderAsync.then((provider) => setI18nProvider(provider))
  }, [])

  if (!i18nProvider) {
    return null
  }

  return (
    <Admin dataProvider={dataProvider} i18nProvider={i18nProvider} layout={Layout}>
      <ResourceContext.Provider value="product">
        <Switch>
          <Route path="/product/create">
            <ProductCreate />
          </Route>
          <Route path="/product/:id/edit">
            <ProductUpdate />
          </Route>
          <Route path="/product/:id">
            <ProductDetail />
          </Route>
          <Route path="/product">
            <ProductList />
          </Route>
        </Switch>
      </ResourceContext.Provider>

      <Route exact path="/">
        None
      </Route>
    </Admin>
  )
}

export default App
