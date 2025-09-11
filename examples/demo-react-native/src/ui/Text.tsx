import type { ReactNode } from "react"

import type { TextProps } from "react-native"
import { Text as ReactNativeText } from "react-native"
import { cx } from "src/lib/cx.tsx"

export default function Text({
  children,
  className,
  style,
  ...props
}: {
  children: ReactNode
  className?: string
} & TextProps) {
  return (
    <ReactNativeText
      className={cx("color-[var(--text)]", className)}
      style={[style]}
      {...props}
    >
      {children}
    </ReactNativeText>
  )
}
