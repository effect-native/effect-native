// @ts-ignore
/// <reference types="nativewind/types.d.ts" />
/// <reference types="fbtee/ReactTypes.d.ts" />

declare module "*.svg" {
  import type { FC } from "react"
  import type { SvgProps } from "react-native-svg"

  const content: FC<SvgProps & { currentColor?: string }>
  export default content
}
