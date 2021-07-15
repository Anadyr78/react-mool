import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  IconType,
} from "@elastic/eui"
import { useLinkProps } from "@react-mool/core"
import { ReactNode } from "react"
import { BreadcrumbsContainer } from "./Breadcrumbs"
import { HeaderNav } from "./HeaderNav"
import { HeaderUserMenu } from "./HeaderUserMenu"

export type HeaderProps = {
  menu?: ReactNode
  appLogo?: IconType
  appTitle?: ReactNode
}

export const Header = (props: HeaderProps) => {
  const { menu, appLogo = "logoElastic", appTitle = "Admin" } = props
  const linkProps = useLinkProps()

  return (
    <>
      <EuiHeader position="fixed">
        <EuiHeaderSection>
          {!!menu && (
            <EuiHeaderSectionItem border="right">
              <HeaderNav menu={menu} />
            </EuiHeaderSectionItem>
          )}
          <EuiHeaderSectionItem border="right">
            <EuiHeaderLogo iconType={appLogo} {...linkProps("/")}>
              {appTitle}
            </EuiHeaderLogo>
          </EuiHeaderSectionItem>
          <BreadcrumbsContainer />
        </EuiHeaderSection>

        <EuiHeaderSection>
          <EuiHeaderSectionItem border="left">
            <HeaderUserMenu />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
    </>
  )
}
