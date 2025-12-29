import { describe, it, expect } from "vitest"
import { tailwindToTui, tw } from "../src/bridge/tailwind-mapper.js"

describe("tailwind-mapper", () => {
  describe("tailwindToTui", () => {
    describe("flex layout", () => {
      it("maps flex direction classes", () => {
        expect(tailwindToTui("flex-col").styles).toEqual({ flexDirection: "column" })
        expect(tailwindToTui("flex-row").styles).toEqual({ flexDirection: "row" })
        expect(tailwindToTui("flex-row-reverse").styles).toEqual({ flexDirection: "row-reverse" })
        expect(tailwindToTui("flex-col-reverse").styles).toEqual({ flexDirection: "column-reverse" })
      })

      it("maps flex wrap classes", () => {
        expect(tailwindToTui("flex-wrap").styles).toEqual({ flexWrap: "wrap" })
        expect(tailwindToTui("flex-nowrap").styles).toEqual({ flexWrap: "no-wrap" })
        expect(tailwindToTui("flex-wrap-reverse").styles).toEqual({ flexWrap: "wrap-reverse" })
      })

      it("maps flex grow/shrink classes", () => {
        expect(tailwindToTui("flex-1").styles).toEqual({ flexGrow: 1, flexShrink: 1, flexBasis: 0 })
        expect(tailwindToTui("grow").styles).toEqual({ flexGrow: 1 })
        expect(tailwindToTui("grow-0").styles).toEqual({ flexGrow: 0 })
        expect(tailwindToTui("shrink").styles).toEqual({ flexShrink: 1 })
        expect(tailwindToTui("shrink-0").styles).toEqual({ flexShrink: 0 })
      })
    })

    describe("alignment", () => {
      it("maps justify-content classes", () => {
        expect(tailwindToTui("justify-start").styles).toEqual({ justifyContent: "flex-start" })
        expect(tailwindToTui("justify-center").styles).toEqual({ justifyContent: "center" })
        expect(tailwindToTui("justify-end").styles).toEqual({ justifyContent: "flex-end" })
        expect(tailwindToTui("justify-between").styles).toEqual({ justifyContent: "space-between" })
        expect(tailwindToTui("justify-around").styles).toEqual({ justifyContent: "space-around" })
        expect(tailwindToTui("justify-evenly").styles).toEqual({ justifyContent: "space-evenly" })
      })

      it("maps align-items classes", () => {
        expect(tailwindToTui("items-start").styles).toEqual({ alignItems: "flex-start" })
        expect(tailwindToTui("items-center").styles).toEqual({ alignItems: "center" })
        expect(tailwindToTui("items-end").styles).toEqual({ alignItems: "flex-end" })
        expect(tailwindToTui("items-stretch").styles).toEqual({ alignItems: "stretch" })
        expect(tailwindToTui("items-baseline").styles).toEqual({ alignItems: "baseline" })
      })

      it("maps align-self classes", () => {
        expect(tailwindToTui("self-auto").styles).toEqual({ alignSelf: "auto" })
        expect(tailwindToTui("self-start").styles).toEqual({ alignSelf: "flex-start" })
        expect(tailwindToTui("self-center").styles).toEqual({ alignSelf: "center" })
        expect(tailwindToTui("self-end").styles).toEqual({ alignSelf: "flex-end" })
        expect(tailwindToTui("self-stretch").styles).toEqual({ alignSelf: "stretch" })
      })
    })

    describe("spacing", () => {
      it("maps padding classes", () => {
        expect(tailwindToTui("p-0").styles).toEqual({ padding: 0 })
        expect(tailwindToTui("p-4").styles).toEqual({ padding: 1 })
        expect(tailwindToTui("p-8").styles).toEqual({ padding: 2 })
        expect(tailwindToTui("px-4").styles).toEqual({ paddingLeft: 1, paddingRight: 1 })
        expect(tailwindToTui("py-4").styles).toEqual({ paddingTop: 1, paddingBottom: 1 })
        expect(tailwindToTui("pt-4").styles).toEqual({ paddingTop: 1 })
        expect(tailwindToTui("pr-4").styles).toEqual({ paddingRight: 1 })
        expect(tailwindToTui("pb-4").styles).toEqual({ paddingBottom: 1 })
        expect(tailwindToTui("pl-4").styles).toEqual({ paddingLeft: 1 })
      })

      it("maps margin classes", () => {
        expect(tailwindToTui("m-0").styles).toEqual({ margin: 0 })
        expect(tailwindToTui("m-4").styles).toEqual({ margin: 1 })
        expect(tailwindToTui("m-auto").styles).toEqual({ margin: "auto" })
        expect(tailwindToTui("mx-auto").styles).toEqual({ marginLeft: "auto", marginRight: "auto" })
        expect(tailwindToTui("my-auto").styles).toEqual({ marginTop: "auto", marginBottom: "auto" })
      })

      it("maps gap classes", () => {
        expect(tailwindToTui("gap-0").styles).toEqual({ gap: 0 })
        expect(tailwindToTui("gap-4").styles).toEqual({ gap: 1 })
        expect(tailwindToTui("gap-x-4").styles).toEqual({ columnGap: 1 })
        expect(tailwindToTui("gap-y-4").styles).toEqual({ rowGap: 1 })
      })
    })

    describe("sizing", () => {
      it("maps width classes", () => {
        expect(tailwindToTui("w-auto").styles).toEqual({ width: "auto" })
        expect(tailwindToTui("w-full").styles).toEqual({ width: "100%" })
        expect(tailwindToTui("w-1/2").styles).toEqual({ width: "50%" })
        expect(tailwindToTui("w-1/3").styles).toEqual({ width: "33%" })
        expect(tailwindToTui("w-2/3").styles).toEqual({ width: "67%" })
      })

      it("maps height classes", () => {
        expect(tailwindToTui("h-auto").styles).toEqual({ height: "auto" })
        expect(tailwindToTui("h-full").styles).toEqual({ height: "100%" })
        expect(tailwindToTui("h-screen").styles).toEqual({ height: "100%" })
      })

      it("maps min/max width/height classes", () => {
        expect(tailwindToTui("min-w-0").styles).toEqual({ minWidth: 0 })
        expect(tailwindToTui("min-h-0").styles).toEqual({ minHeight: 0 })
        expect(tailwindToTui("max-w-full").styles).toEqual({ maxWidth: "100%" })
        expect(tailwindToTui("max-h-full").styles).toEqual({ maxHeight: "100%" })
      })
    })

    describe("colors", () => {
      it("maps background color classes", () => {
        const result = tailwindToTui("bg-blue-500")
        expect(result.styles.bg).toBe("#3B82F6")
        expect(result.styles.backgroundColor).toBe("#3B82F6")
      })

      it("maps text color classes", () => {
        const result = tailwindToTui("text-red-500")
        expect(result.styles.fg).toBe("#EF4444")
      })

      it("maps border color classes", () => {
        const result = tailwindToTui("border-gray-300")
        expect(result.styles.borderColor).toBe("#D1D5DB")
      })

      it("maps simple colors", () => {
        expect(tailwindToTui("bg-white").styles.bg).toBe("#FFFFFF")
        expect(tailwindToTui("bg-black").styles.bg).toBe("#000000")
        expect(tailwindToTui("text-white").styles.fg).toBe("#FFFFFF")
      })
    })

    describe("borders", () => {
      it("maps border classes", () => {
        expect(tailwindToTui("border").styles).toEqual({ border: true, borderStyle: "single" })
        expect(tailwindToTui("border-0").styles).toEqual({ border: false })
        expect(tailwindToTui("border-2").styles).toEqual({ border: true, borderStyle: "double" })
        expect(tailwindToTui("border-4").styles).toEqual({ border: true, borderStyle: "heavy" })
      })

      it("maps border side classes", () => {
        expect(tailwindToTui("border-t").styles).toEqual({ border: ["top"] })
        expect(tailwindToTui("border-r").styles).toEqual({ border: ["right"] })
        expect(tailwindToTui("border-b").styles).toEqual({ border: ["bottom"] })
        expect(tailwindToTui("border-l").styles).toEqual({ border: ["left"] })
      })

      it("maps border style classes", () => {
        expect(tailwindToTui("rounded").styles).toEqual({ borderStyle: "rounded" })
        expect(tailwindToTui("rounded-none").styles).toEqual({ borderStyle: "single" })
      })
    })

    describe("typography", () => {
      it("maps font weight classes", () => {
        expect(tailwindToTui("font-bold").styles).toEqual({ bold: true })
        expect(tailwindToTui("font-normal").styles).toEqual({ bold: false })
      })

      it("maps text decoration classes", () => {
        expect(tailwindToTui("italic").styles).toEqual({ italic: true })
        expect(tailwindToTui("not-italic").styles).toEqual({ italic: false })
        expect(tailwindToTui("underline").styles).toEqual({ underline: true })
        expect(tailwindToTui("no-underline").styles).toEqual({ underline: false })
        expect(tailwindToTui("line-through").styles).toEqual({ strikethrough: true })
      })
    })

    describe("visibility", () => {
      it("maps visibility classes", () => {
        expect(tailwindToTui("hidden").styles).toEqual({ visible: false })
        expect(tailwindToTui("invisible").styles).toEqual({ visible: false })
        expect(tailwindToTui("visible").styles).toEqual({ visible: true })
      })

      it("maps overflow classes", () => {
        expect(tailwindToTui("overflow-hidden").styles).toEqual({ overflow: "hidden" })
        expect(tailwindToTui("overflow-visible").styles).toEqual({ overflow: "visible" })
        expect(tailwindToTui("overflow-scroll").styles).toEqual({ overflow: "scroll" })
        expect(tailwindToTui("overflow-auto").styles).toEqual({ overflow: "scroll" })
      })
    })

    describe("position", () => {
      it("maps position classes", () => {
        expect(tailwindToTui("static").styles).toEqual({ position: "static" })
        expect(tailwindToTui("relative").styles).toEqual({ position: "relative" })
        expect(tailwindToTui("absolute").styles).toEqual({ position: "absolute" })
      })

      it("maps position value classes", () => {
        expect(tailwindToTui("inset-0").styles).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
        expect(tailwindToTui("top-0").styles).toEqual({ top: 0 })
        expect(tailwindToTui("right-0").styles).toEqual({ right: 0 })
        expect(tailwindToTui("bottom-0").styles).toEqual({ bottom: 0 })
        expect(tailwindToTui("left-0").styles).toEqual({ left: 0 })
      })
    })

    describe("z-index and opacity", () => {
      it("maps z-index classes", () => {
        expect(tailwindToTui("z-10").styles).toEqual({ zIndex: 10 })
        expect(tailwindToTui("z-50").styles).toEqual({ zIndex: 50 })
      })

      it("maps opacity classes", () => {
        expect(tailwindToTui("opacity-0").styles).toEqual({ opacity: 0 })
        expect(tailwindToTui("opacity-50").styles).toEqual({ opacity: 0.5 })
        expect(tailwindToTui("opacity-100").styles).toEqual({ opacity: 1 })
      })
    })

    describe("composite classes", () => {
      it("combines multiple classes", () => {
        const result = tailwindToTui("flex flex-col gap-2 p-4 bg-blue-500 text-white")
        expect(result.styles).toEqual({
          flexDirection: "column",
          gap: 1,
          padding: 1,
          bg: "#3B82F6",
          backgroundColor: "#3B82F6",
          fg: "#FFFFFF",
        })
      })

      it("tracks unmapped classes", () => {
        const result = tailwindToTui("flex flex-col text-lg shadow-md")
        expect(result.unmapped).toContain("text-lg")
        expect(result.unmapped).toContain("shadow-md")
        expect(result.unmapped).not.toContain("flex")
        expect(result.unmapped).not.toContain("flex-col")
      })
    })

    describe("responsive and state prefixes", () => {
      it("treats responsive prefixes as unmapped", () => {
        const result = tailwindToTui("sm:flex-col md:flex-row lg:gap-4")
        expect(result.unmapped).toContain("sm:flex-col")
        expect(result.unmapped).toContain("md:flex-row")
        expect(result.unmapped).toContain("lg:gap-4")
      })

      it("treats state prefixes as unmapped", () => {
        const result = tailwindToTui("hover:bg-blue-600 focus:ring-2 active:scale-95")
        expect(result.unmapped).toContain("hover:bg-blue-600")
        expect(result.unmapped).toContain("focus:ring-2")
        expect(result.unmapped).toContain("active:scale-95")
      })

      it("treats dark mode prefix as unmapped", () => {
        const result = tailwindToTui("dark:bg-gray-900 dark:text-white")
        expect(result.unmapped).toContain("dark:bg-gray-900")
        expect(result.unmapped).toContain("dark:text-white")
      })
    })
  })

  describe("tw helper function", () => {
    it("returns just styles without unmapped array", () => {
      const styles = tw("flex flex-col gap-2")
      expect(styles).toEqual({
        flexDirection: "column",
        gap: 1,
      })
    })
  })
})
