import { Atom, useAtomValue, useAtomSet } from "@effect-atom/atom-react"
import Text from "../Text"
import { BaseButton } from "react-native-gesture-handler"

const countAtom = Atom.make(0).pipe(
  // By default, the Atom will be reset when no longer used.
  // This is useful for cleaning up resources when the component unmounts.
  //
  // If you want to keep the value, you can use `Atom.keepAlive`.
  //
  Atom.keepAlive,
)

export function Counter() {
  const count = useAtomValue(countAtom)
  return <Text>{count}</Text>
}

export function CounterButton() {
  const setCount = useAtomSet(countAtom)
  return (
    <BaseButton onPress={() => setCount((count) => count + 1)}><Text>Increment</Text></BaseButton>
  )
}
