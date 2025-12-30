/**
 * TUI Miniapp - Validation Demo for @effect-native/opentui-dom
 *
 * Demonstrates all core features:
 * - Form elements (inputs, textarea, checkboxes, radios, select)
 * - Dialog/modal with focus trapping
 * - Buttons with keyboard activation
 * - Tab/Shift+Tab navigation
 * - Arrow key navigation (radio groups, select)
 * - Accesskeys (Alt+key shortcuts)
 *
 * Run with: bun run poc/miniapp.tsx
 *
 * Keyboard Controls:
 * - Tab/Shift+Tab: Navigate between elements
 * - Space: Toggle checkbox, check radio, activate button
 * - Enter: Activate button, confirm dialog
 * - Arrow Up/Down: Navigate radio group or select options
 * - Backspace: Delete character in text fields
 * - Alt+N: Focus Name input
 * - Alt+E: Focus Email input
 * - Alt+D: Open dialog
 * - Alt+S: Submit form
 * - Alt+R: Reset form
 * - Escape: Close dialog
 * - Ctrl+C: Exit
 */

// Polyfill console.timeStamp BEFORE React import (React 19 dev mode requires it)
if (!console.timeStamp) {
  ;(console as any).timeStamp = () => {}
}

import { Window } from "happy-dom"
import React, { useState, useCallback } from "react"
import { createRoot } from "react-dom/client"
import {
  createCliRenderer,
  BoxRenderable,
  TextRenderable,
  ScrollBoxRenderable,
  type KeyEvent as TUIKeyEvent,
} from "@opentui/core"
import {
  createEventRelay,
  createNodeMap,
  type NodeMap,
  type TUIRenderer,
} from "@effect-native/opentui-dom"

// ─────────────────────────────────────────────────────────────────
// Happy-DOM Setup
// ─────────────────────────────────────────────────────────────────

const happyWindow = new Window({
  url: "https://localhost:8080",
  width: 1024,
  height: 768,
})

const happyDocument = happyWindow.document

// Preserve Bun's timer functions
const bunSetTimeout = globalThis.setTimeout
const bunSetInterval = globalThis.setInterval
const bunClearTimeout = globalThis.clearTimeout
const bunClearInterval = globalThis.clearInterval
const bunQueueMicrotask = globalThis.queueMicrotask

// Set happy-dom globals for react-dom
// @ts-expect-error Happy-DOM Window is not fully compatible with lib.dom Window
globalThis.window = happyWindow as unknown as Window & typeof globalThis
globalThis.document = happyDocument as unknown as Document

Object.assign(globalThis, {
  Node: happyWindow.Node,
  Element: happyWindow.Element,
  HTMLElement: happyWindow.HTMLElement,
  DocumentFragment: happyWindow.DocumentFragment,
  Event: happyWindow.Event,
  CustomEvent: happyWindow.CustomEvent,
  MutationObserver: happyWindow.MutationObserver,
})

// Restore Bun's timer functions
globalThis.setTimeout = bunSetTimeout
globalThis.setInterval = bunSetInterval
globalThis.clearTimeout = bunClearTimeout
globalThis.clearInterval = bunClearInterval
globalThis.queueMicrotask = bunQueueMicrotask

// ─────────────────────────────────────────────────────────────────
// Style Constants
// ─────────────────────────────────────────────────────────────────

const NORMAL_BORDER_COLOR = "#666666"
const FOCUSED_BORDER_COLOR = "#00ff00"
const NORMAL_BG = undefined
const FOCUSED_BG = "#333333"
const DIALOG_BORDER_COLOR = "#3B82F6"
const PRIMARY_COLOR = "#3B82F6"
const WARNING_COLOR = "#EAB308"

// ─────────────────────────────────────────────────────────────────
// React Component - Main Form
// ─────────────────────────────────────────────────────────────────

function MiniApp() {
  return (
    <div id="app-root">
      <form id="demo-form">
        {/* Text inputs */}
        <input id="input-name" type="text" placeholder="Name" accessKey="n" />
        <input id="input-email" type="email" placeholder="Email" accessKey="e" />

        {/* Textarea */}
        <textarea id="textarea-comments" placeholder="Comments" />

        {/* Checkboxes */}
        <input type="checkbox" id="cb-newsletter" name="newsletter" />
        <input type="checkbox" id="cb-terms" name="terms" />

        {/* Radio group */}
        <div id="radio-group" role="radiogroup" aria-label="Priority">
          <input type="radio" id="radio-low" name="priority" value="low" tabIndex={0} />
          <input type="radio" id="radio-medium" name="priority" value="medium" tabIndex={-1} />
          <input type="radio" id="radio-high" name="priority" value="high" tabIndex={-1} />
        </div>

        {/* Select */}
        <select id="country-select">
          <option value="usa">United States</option>
          <option value="canada">Canada</option>
          <option value="mexico">Mexico</option>
          <option value="uk">United Kingdom</option>
          <option value="germany">Germany</option>
        </select>

        {/* Buttons */}
        <button id="dialog-btn" type="button" accessKey="d">Open Dialog</button>
        <button id="submit-btn" type="button" accessKey="s">Submit</button>
        <button id="reset-btn" type="button" accessKey="r">Reset</button>
      </form>

      {/* Dialog (modal) - initially hidden */}
      <div id="dialog-container" style={{ display: "none" }}>
        <div id="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h2 id="dialog-title">Confirm Action</h2>
          <p id="dialog-message">Are you sure you want to proceed?</p>
          <button id="dialog-confirm" type="button">Confirm</button>
          <button id="dialog-cancel" type="button">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Visual Rendering Helpers
// ─────────────────────────────────────────────────────────────────

function renderCheckboxVisual(checked: boolean): string {
  return checked ? "[x]" : "[ ]"
}

function renderRadioVisual(checked: boolean): string {
  return checked ? "(*)" : "( )"
}

// ─────────────────────────────────────────────────────────────────
// Main Demo
// ─────────────────────────────────────────────────────────────────

async function main() {
  // Render React to happy-dom
  const container = happyDocument.createElement("div")
  container.id = "root"
  happyDocument.body.appendChild(container)

  const root = createRoot(container as unknown as HTMLElement)
  root.render(<MiniApp />)

  // Wait for React to render
  await new Promise((resolve) => setTimeout(resolve, 50))
  await happyWindow.happyDOM.waitUntilComplete()

  // ─────────────────────────────────────────────────────────────────
  // Get DOM Element References
  // ─────────────────────────────────────────────────────────────────

  const inputName = happyDocument.getElementById("input-name") as unknown as HTMLInputElement
  const inputEmail = happyDocument.getElementById("input-email") as unknown as HTMLInputElement
  const textareaComments = happyDocument.getElementById("textarea-comments") as unknown as HTMLTextAreaElement
  const cbNewsletter = happyDocument.getElementById("cb-newsletter") as unknown as HTMLInputElement
  const cbTerms = happyDocument.getElementById("cb-terms") as unknown as HTMLInputElement
  const radioLow = happyDocument.getElementById("radio-low") as unknown as HTMLInputElement
  const radioMedium = happyDocument.getElementById("radio-medium") as unknown as HTMLInputElement
  const radioHigh = happyDocument.getElementById("radio-high") as unknown as HTMLInputElement
  const countrySelect = happyDocument.getElementById("country-select") as unknown as HTMLSelectElement
  const dialogBtn = happyDocument.getElementById("dialog-btn") as unknown as HTMLButtonElement
  const submitBtn = happyDocument.getElementById("submit-btn") as unknown as HTMLButtonElement
  const resetBtn = happyDocument.getElementById("reset-btn") as unknown as HTMLButtonElement
  
  // Dialog elements
  const dialogContainer = happyDocument.getElementById("dialog-container") as unknown as HTMLDivElement
  const dialog = happyDocument.getElementById("dialog") as unknown as HTMLDivElement
  const dialogConfirm = happyDocument.getElementById("dialog-confirm") as unknown as HTMLButtonElement
  const dialogCancel = happyDocument.getElementById("dialog-cancel") as unknown as HTMLButtonElement

  const radios = [radioLow, radioMedium, radioHigh]
  const radioLabels = ["Low", "Medium", "High"]

  // ─────────────────────────────────────────────────────────────────
  // Create OpenTUI Renderer
  // ─────────────────────────────────────────────────────────────────

  const renderer = await createCliRenderer({
    useAlternateScreen: true,
    exitOnCtrlC: true,
    useMouse: false,
  })

  const { root: tuiRoot } = renderer
  const nodeMap = createNodeMap()

  // ─────────────────────────────────────────────────────────────────
  // Build TUI Layout
  // ─────────────────────────────────────────────────────────────────

  // Main layout container
  const mainBox = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 1,
    paddingBottom: 8,
    gap: 1,
    position: "relative",
  })

  // Title bar
  const titleBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: PRIMARY_COLOR,
    padding: 1,
  })
  const titleText = new TextRenderable(renderer, {
    content: "TUI MINIAPP - @effect-native/opentui-dom Validation",
    fg: "#ffffff",
  })
  titleBox.add(titleText)

  // Instructions
  const instructionsBox = new BoxRenderable(renderer, {
    padding: 1,
    flexDirection: "column",
  })
  const instructionsText1 = new TextRenderable(renderer, {
    content: "Tab/Shift+Tab: navigate | Space: toggle/check | Enter: button | Arrows: radio/select",
    fg: "#888888",
  })
  const instructionsText2 = new TextRenderable(renderer, {
    content: "Alt+[N]ame | Alt+[E]mail | Alt+[D]ialog | Alt+[S]ubmit | Alt+[R]eset | Ctrl+C: exit",
    fg: "#888888",
  })
  instructionsBox.add(instructionsText1)
  instructionsBox.add(instructionsText2)

  // ─────────────────────────────────────────────────────────────────
  // Form Fields Section
  // ─────────────────────────────────────────────────────────────────

  const fieldsBox = new ScrollBoxRenderable(renderer, {
    scrollY: true,
    flexDirection: "column",
    gap: 1,
    padding: 1,
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    title: " Form Fields ",
    maxHeight: 20,
    flexGrow: 1,
  })

  // Track value renderables for updates
  const valueRenderables: Map<Element, TextRenderable> = new Map()

  // --- Name Input ---
  const nameBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "row",
    width: 50,
  })
  const nameLabel = new TextRenderable(renderer, { content: "[N]ame:    ", fg: "#888888" })
  const nameValue = new TextRenderable(renderer, { content: "_" })
  nameBox.add(nameLabel)
  nameBox.add(nameValue)
  nodeMap.setRenderable(inputName as unknown as Node, nameBox)
  valueRenderables.set(inputName, nameValue)

  // --- Email Input ---
  const emailBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "row",
    width: 50,
  })
  const emailLabel = new TextRenderable(renderer, { content: "[E]mail:   ", fg: "#888888" })
  const emailValue = new TextRenderable(renderer, { content: "_" })
  emailBox.add(emailLabel)
  emailBox.add(emailValue)
  nodeMap.setRenderable(inputEmail as unknown as Node, emailBox)
  valueRenderables.set(inputEmail, emailValue)

  // --- Comments Textarea ---
  const commentsBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "column",
    width: 50,
    height: 5,
  })
  const commentsLabel = new TextRenderable(renderer, { content: "Comments:", fg: "#888888" })
  const commentsValue = new TextRenderable(renderer, { content: "_" })
  commentsBox.add(commentsLabel)
  commentsBox.add(commentsValue)
  nodeMap.setRenderable(textareaComments as unknown as Node, commentsBox)
  valueRenderables.set(textareaComments, commentsValue)

  // --- Checkbox: Newsletter ---
  const cbNewsletterBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "row",
    width: 50,
  })
  const cbNewsletterIndicator = new TextRenderable(renderer, { content: renderCheckboxVisual(false) })
  const cbNewsletterLabel = new TextRenderable(renderer, { content: " Subscribe to newsletter" })
  cbNewsletterBox.add(cbNewsletterIndicator)
  cbNewsletterBox.add(cbNewsletterLabel)
  nodeMap.setRenderable(cbNewsletter as unknown as Node, cbNewsletterBox)

  // --- Checkbox: Terms ---
  const cbTermsBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "row",
    width: 50,
  })
  const cbTermsIndicator = new TextRenderable(renderer, { content: renderCheckboxVisual(false) })
  const cbTermsLabel = new TextRenderable(renderer, { content: " Accept terms and conditions" })
  cbTermsBox.add(cbTermsIndicator)
  cbTermsBox.add(cbTermsLabel)
  nodeMap.setRenderable(cbTerms as unknown as Node, cbTermsBox)

  // --- Radio Group: Priority ---
  const radioGroupBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "column",
    width: 50,
    title: " Priority (arrows navigate) ",
  })

  const radioBoxes: BoxRenderable[] = []
  const radioIndicators: TextRenderable[] = []

  for (let i = 0; i < radios.length; i++) {
    const box = new BoxRenderable(renderer, {
      border: true,
      borderColor: NORMAL_BORDER_COLOR,
      padding: 1,
      flexDirection: "row",
    })
    const indicator = new TextRenderable(renderer, { content: renderRadioVisual(false) })
    const label = new TextRenderable(renderer, { content: ` ${radioLabels[i]}` })
    box.add(indicator)
    box.add(label)
    radioBoxes.push(box)
    radioIndicators.push(indicator)
    const radio = radios[i]
    if (radio) nodeMap.setRenderable(radio as unknown as Node, box)
    radioGroupBox.add(box)
  }

  // --- Select: Country ---
  const selectBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
    flexDirection: "row",
    width: 50,
  })
  const selectLabel = new TextRenderable(renderer, { content: "Country:   ", fg: "#888888" })
  const selectValue = new TextRenderable(renderer, { content: "[ United States    v ]" })
  selectBox.add(selectLabel)
  selectBox.add(selectValue)
  nodeMap.setRenderable(countrySelect as unknown as Node, selectBox)

  // --- Buttons Row ---
  const buttonsBox = new BoxRenderable(renderer, {
    flexDirection: "row",
    gap: 2,
    padding: 1,
  })

  // Dialog Button
  const dialogBtnBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
  })
  const dialogBtnText = new TextRenderable(renderer, { content: "[ [D]ialog ]" })
  dialogBtnBox.add(dialogBtnText)
  nodeMap.setRenderable(dialogBtn as unknown as Node, dialogBtnBox)

  // Submit Button
  const submitBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
  })
  const submitText = new TextRenderable(renderer, { content: "[ [S]ubmit ]" })
  submitBox.add(submitText)
  nodeMap.setRenderable(submitBtn as unknown as Node, submitBox)

  // Reset Button
  const resetBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
  })
  const resetText = new TextRenderable(renderer, { content: "[ [R]eset ]" })
  resetBox.add(resetText)
  nodeMap.setRenderable(resetBtn as unknown as Node, resetBox)

  buttonsBox.add(dialogBtnBox)
  buttonsBox.add(submitBox)
  buttonsBox.add(resetBox)

  // Add all fields to container
  fieldsBox.add(nameBox)
  fieldsBox.add(emailBox)
  fieldsBox.add(commentsBox)
  fieldsBox.add(cbNewsletterBox)
  fieldsBox.add(cbTermsBox)
  fieldsBox.add(radioGroupBox)
  fieldsBox.add(selectBox)
  fieldsBox.add(buttonsBox)

  // ─────────────────────────────────────────────────────────────────
  // Dialog TUI Layout (overlay)
  // ─────────────────────────────────────────────────────────────────

  const dialogBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: DIALOG_BORDER_COLOR,
    padding: 2,
    flexDirection: "column",
    gap: 1,
    width: 40,
    position: "absolute",
    top: 5,
    left: 20,
    display: "none", // Initially hidden
  })

  const dialogTitleText = new TextRenderable(renderer, { 
    content: "Confirm Action", 
    fg: "#ffffff" 
  })
  const dialogMessageText = new TextRenderable(renderer, { 
    content: "Are you sure you want to proceed?", 
    fg: "#cccccc" 
  })
  
  const dialogButtonsBox = new BoxRenderable(renderer, {
    flexDirection: "row",
    gap: 2,
  })

  const dialogConfirmBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
  })
  const dialogConfirmText = new TextRenderable(renderer, { content: "[ Confirm ]" })
  dialogConfirmBox.add(dialogConfirmText)
  nodeMap.setRenderable(dialogConfirm as unknown as Node, dialogConfirmBox)

  const dialogCancelBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: NORMAL_BORDER_COLOR,
    padding: 1,
  })
  const dialogCancelText = new TextRenderable(renderer, { content: "[ Cancel ]" })
  dialogCancelBox.add(dialogCancelText)
  nodeMap.setRenderable(dialogCancel as unknown as Node, dialogCancelBox)

  dialogButtonsBox.add(dialogConfirmBox)
  dialogButtonsBox.add(dialogCancelBox)

  dialogBox.add(dialogTitleText)
  dialogBox.add(dialogMessageText)
  dialogBox.add(dialogButtonsBox)

  // ─────────────────────────────────────────────────────────────────
  // Status Section
  // ─────────────────────────────────────────────────────────────────

  const statusBox = new BoxRenderable(renderer, {
    border: true,
    borderColor: WARNING_COLOR,
    padding: 1,
    title: " Status ",
    position: "absolute",
    bottom: 0,
    left: 1,
    right: 1,
    height: 7,
    flexDirection: "column",
  })
  const focusDisplay = new TextRenderable(renderer, { content: "Focused: (none)" })
  const stateDisplay = new TextRenderable(renderer, { content: "" })
  const actionDisplay = new TextRenderable(renderer, { content: "Ready", fg: "#00ff00" })
  statusBox.add(focusDisplay)
  statusBox.add(stateDisplay)
  statusBox.add(actionDisplay)

  // Build main layout
  mainBox.add(titleBox)
  mainBox.add(instructionsBox)
  mainBox.add(fieldsBox)
  mainBox.add(statusBox)
  mainBox.add(dialogBox)
  tuiRoot.add(mainBox)

  // ─────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────

  let currentFocusedRenderable: BoxRenderable | null = null
  let currentFocusedElement: Element | null = null
  let dialogVisible = false

  function applyFocusStyle(renderable: BoxRenderable, focused: boolean) {
    if (focused) {
      renderable.borderColor = FOCUSED_BORDER_COLOR
      renderable.backgroundColor = FOCUSED_BG
    } else {
      renderable.borderColor = NORMAL_BORDER_COLOR
      renderable.backgroundColor = NORMAL_BG
    }
  }

  function getElementName(el: Element): string {
    const id = el.id
    if (id === "input-name") return "Name input"
    if (id === "input-email") return "Email input"
    if (id === "textarea-comments") return "Comments textarea"
    if (id === "cb-newsletter") return "Newsletter checkbox"
    if (id === "cb-terms") return "Terms checkbox"
    if (id === "radio-low") return "Priority: Low"
    if (id === "radio-medium") return "Priority: Medium"
    if (id === "radio-high") return "Priority: High"
    if (id === "country-select") return "Country select"
    if (id === "dialog-btn") return "Dialog button"
    if (id === "submit-btn") return "Submit button"
    if (id === "reset-btn") return "Reset button"
    if (id === "dialog-confirm") return "Dialog confirm"
    if (id === "dialog-cancel") return "Dialog cancel"
    return id || el.tagName
  }

  function updateDisplayValue(element: Element, showCursor: boolean) {
    const valueRenderable = valueRenderables.get(element)
    if (!valueRenderable) return

    const inputEl = element as HTMLInputElement | HTMLTextAreaElement
    const value = inputEl.value ?? ""
    const placeholder = inputEl.placeholder ?? ""

    if (value) {
      valueRenderable.content = showCursor ? value + "_" : value
      valueRenderable.fg = undefined
    } else if (showCursor) {
      valueRenderable.content = "_"
      valueRenderable.fg = undefined
    } else if (placeholder) {
      valueRenderable.content = placeholder
      valueRenderable.fg = "#666666"
    } else {
      valueRenderable.content = "(empty)"
      valueRenderable.fg = "#666666"
    }
  }

  function updateSelectDisplay() {
    const text = countrySelect.options[countrySelect.selectedIndex]?.textContent || ""
    selectValue.content = `[ ${text.padEnd(15)} v ]`
  }

  function updateCheckboxVisuals() {
    cbNewsletterIndicator.content = renderCheckboxVisual(cbNewsletter.checked)
    cbTermsIndicator.content = renderCheckboxVisual(cbTerms.checked)
  }

  function updateRadioVisuals() {
    for (let i = 0; i < radios.length; i++) {
      const indicator = radioIndicators[i]
      const radio = radios[i]
      if (indicator && radio) indicator.content = renderRadioVisual(radio.checked)
    }
  }

  function updateFormStateDisplay() {
    const name = inputName.value || "(empty)"
    const email = inputEmail.value || "(empty)"
    const priority = radios.find((r) => r.checked)?.value ?? "(none)"
    const country = countrySelect.options[countrySelect.selectedIndex]?.textContent || "(none)"

    stateDisplay.content = `Name: ${name} | Email: ${email} | Priority: ${priority} | Country: ${country}`
  }

  function updateStatus(msg: string) {
    actionDisplay.content = msg
    renderer.requestRender()
  }

  function updateAllVisuals() {
    updateCheckboxVisuals()
    updateRadioVisuals()
    updateSelectDisplay()
    updateFormStateDisplay()

    updateDisplayValue(inputName, inputName === currentFocusedElement)
    updateDisplayValue(inputEmail, inputEmail === currentFocusedElement)
    updateDisplayValue(textareaComments, textareaComments === currentFocusedElement)

    renderer.requestRender()
  }

  function showDialog() {
    dialogVisible = true
    dialogContainer.style.display = "block"
    dialogBox.display = "flex"
    relay.activateFocusTrap(dialog as unknown as Element)
    dialogConfirm.focus()
    updateStatus("Dialog opened - Escape to close")
    renderer.requestRender()
  }

  function hideDialog() {
    dialogVisible = false
    dialogContainer.style.display = "none"
    dialogBox.display = "none"
    relay.deactivateFocusTrap()
    updateStatus("Dialog closed")
    renderer.requestRender()
  }

  // ─────────────────────────────────────────────────────────────────
  // Focus Event Handling
  // ─────────────────────────────────────────────────────────────────

  happyDocument.addEventListener("focusin", (e) => {
    const target = e.target as unknown as HTMLElement

    if (currentFocusedElement) {
      updateDisplayValue(currentFocusedElement, false)
    }

    if (currentFocusedRenderable) {
      applyFocusStyle(currentFocusedRenderable, false)
    }

    const renderable = nodeMap.getRenderable(target) as BoxRenderable | undefined
    if (renderable) {
      applyFocusStyle(renderable, true)
      currentFocusedRenderable = renderable
    }

    currentFocusedElement = target
    updateDisplayValue(target, true)

    focusDisplay.content = `Focused: ${getElementName(target)}`

    renderer.requestRender()
  })

  // ─────────────────────────────────────────────────────────────────
  // Input Change Handlers
  // ─────────────────────────────────────────────────────────────────

  inputName.addEventListener("input", () => {
    updateDisplayValue(inputName, inputName === currentFocusedElement)
    updateFormStateDisplay()
    renderer.requestRender()
  })

  inputEmail.addEventListener("input", () => {
    updateDisplayValue(inputEmail, inputEmail === currentFocusedElement)
    updateFormStateDisplay()
    renderer.requestRender()
  })

  textareaComments.addEventListener("input", () => {
    updateDisplayValue(textareaComments, textareaComments === currentFocusedElement)
    updateFormStateDisplay()
    renderer.requestRender()
  })

  cbNewsletter.addEventListener("change", updateAllVisuals)
  cbTerms.addEventListener("change", updateAllVisuals)

  for (const radio of radios) {
    radio.addEventListener("change", updateAllVisuals)
  }

  countrySelect.addEventListener("change", () => {
    updateSelectDisplay()
    updateFormStateDisplay()
    renderer.requestRender()
  })

  // ─────────────────────────────────────────────────────────────────
  // Button Click Handlers
  // ─────────────────────────────────────────────────────────────────

  dialogBtn.addEventListener("click", () => {
    showDialog()
  })

  submitBtn.addEventListener("click", () => {
    const name = inputName.value || "(empty)"
    const email = inputEmail.value || "(empty)"
    const comments = textareaComments.value || "(empty)"
    const newsletter = cbNewsletter.checked ? "Yes" : "No"
    const terms = cbTerms.checked ? "Yes" : "No"
    const priority = radios.find((r) => r.checked)?.value ?? "(none)"
    const country = countrySelect.options[countrySelect.selectedIndex]?.textContent || "(none)"

    updateStatus(
      `SUBMITTED: Name="${name}" Email="${email}" Newsletter=${newsletter} ` +
        `Terms=${terms} Priority=${priority} Country="${country}"`
    )
  })

  resetBtn.addEventListener("click", () => {
    inputName.value = ""
    inputEmail.value = ""
    textareaComments.value = ""
    cbNewsletter.checked = false
    cbTerms.checked = false

    for (const radio of radios) {
      radio.checked = false
      radio.tabIndex = -1
    }
    const firstRadio = radios[0]
    if (firstRadio) firstRadio.tabIndex = 0

    countrySelect.selectedIndex = 0

    updateAllVisuals()
    updateStatus("Form reset to initial state")
  })

  dialogConfirm.addEventListener("click", () => {
    hideDialog()
    updateStatus("Action confirmed!")
  })

  dialogCancel.addEventListener("click", () => {
    hideDialog()
  })

  // ─────────────────────────────────────────────────────────────────
  // Radio Group Roving Tabindex
  // ─────────────────────────────────────────────────────────────────

  function moveRadioFocus(direction: "next" | "previous"): void {
    const currentIndex = radios.findIndex((r) => r.tabIndex === 0)
    if (currentIndex === -1) return

    let newIndex: number
    if (direction === "next") {
      newIndex = (currentIndex + 1) % radios.length
    } else {
      newIndex = (currentIndex - 1 + radios.length) % radios.length
    }

    const currentRadio = radios[currentIndex]
    const newRadio = radios[newIndex]
    if (currentRadio) currentRadio.tabIndex = -1
    if (newRadio) {
      newRadio.tabIndex = 0
      newRadio.focus()
      newRadio.checked = true
      const win = happyDocument.defaultView!
      const changeEvent = new win.Event("change", { bubbles: true })
      newRadio.dispatchEvent(changeEvent as unknown as Event)
    }
  }

  function isFocusInRadioGroup(): boolean {
    const activeEl = happyDocument.activeElement as unknown as Element
    return radios.some((r) => activeEl === (r as unknown as Element))
  }

  function isCheckbox(el: Element): el is HTMLInputElement {
    return el.tagName.toLowerCase() === "input" && (el as HTMLInputElement).type === "checkbox"
  }

  function isRadio(el: Element): el is HTMLInputElement {
    return el.tagName.toLowerCase() === "input" && (el as HTMLInputElement).type === "radio"
  }

  function isButton(el: Element): el is HTMLButtonElement {
    return el.tagName.toLowerCase() === "button"
  }

  // ─────────────────────────────────────────────────────────────────
  // Select Arrow Navigation
  // ─────────────────────────────────────────────────────────────────

  function handleSelectArrowKey(select: HTMLSelectElement, direction: "up" | "down"): boolean {
    const optionCount = select.options.length
    if (optionCount === 0) return false

    let newIndex = select.selectedIndex

    if (direction === "down") {
      newIndex = (newIndex + 1) % optionCount
    } else {
      newIndex = (newIndex - 1 + optionCount) % optionCount
    }

    select.selectedIndex = newIndex
    select.dispatchEvent(new Event("change", { bubbles: true }))
    return true
  }

  // ─────────────────────────────────────────────────────────────────
  // Event Relay and Custom Key Handling
  // ─────────────────────────────────────────────────────────────────

  const relay = createEventRelay({ debug: false })
  relay.attach(renderer as unknown as TUIRenderer, happyDocument as unknown as Document, nodeMap)

  // Connect scroll container
  const formElement = happyDocument.getElementById("demo-form")!
  relay.setScrollContainer(formElement as unknown as Element, {
    get scrollTop() {
      return fieldsBox.scrollTop
    },
    set scrollTop(value: number) {
      fieldsBox.scrollTop = value
    },
    scrollTo(position: number | { x: number; y: number }) {
      fieldsBox.scrollTo(position)
    },
    get viewport() {
      return {
        height: fieldsBox.viewport.height,
        width: fieldsBox.viewport.width,
      }
    },
  })

  // Custom key handler for Space, Enter, Arrows
  renderer.keyInput.on("keypress", (tuiEvent: TUIKeyEvent) => {
    const name = tuiEvent.name.toLowerCase()
    const target = happyDocument.activeElement as unknown as HTMLElement

    // Handle Escape to close dialog
    if (name === "escape" && dialogVisible) {
      hideDialog()
      tuiEvent.preventDefault()
      return
    }

    // Handle Space for checkbox toggle
    if (name === "space" && isCheckbox(target)) {
      target.checked = !target.checked
      const win = happyDocument.defaultView!
      const changeEvent = new win.Event("change", { bubbles: true })
      target.dispatchEvent(changeEvent as unknown as Event)
      tuiEvent.preventDefault()
      return
    }

    // Handle Space for radio
    if (name === "space" && isRadio(target)) {
      if (!target.checked) {
        target.checked = true
        for (const radio of radios) {
          radio.tabIndex = (radio as unknown as Element) === (target as unknown as Element) ? 0 : -1
        }
        const win = happyDocument.defaultView!
        const changeEvent = new win.Event("change", { bubbles: true })
        target.dispatchEvent(changeEvent as unknown as Event)
      }
      tuiEvent.preventDefault()
      return
    }

    // Handle Space/Enter for buttons
    if ((name === "space" || name === "return") && isButton(target)) {
      target.click()
      tuiEvent.preventDefault()
      return
    }

    // Handle Arrow keys for radio group navigation
    if (isFocusInRadioGroup()) {
      if (name === "down" || name === "right") {
        moveRadioFocus("next")
        tuiEvent.preventDefault()
        return
      }
      if (name === "up" || name === "left") {
        moveRadioFocus("previous")
        tuiEvent.preventDefault()
        return
      }
    }

    // Handle Arrow keys for select navigation
    if (target === countrySelect) {
      if (name === "down") {
        handleSelectArrowKey(countrySelect, "down")
        tuiEvent.preventDefault()
        return
      }
      if (name === "up") {
        handleSelectArrowKey(countrySelect, "up")
        tuiEvent.preventDefault()
        return
      }
    }
  })

  // ─────────────────────────────────────────────────────────────────
  // Initialize and Run
  // ─────────────────────────────────────────────────────────────────

  // Focus first input initially
  inputName.focus()

  // Initial render
  updateAllVisuals()
  renderer.requestRender()
  await renderer.idle()

  // Track cleanup state
  let destroyed = false

  const cleanup = () => {
    if (destroyed) return
    destroyed = true
    relay.detach()
    renderer.destroy()
    happyWindow.happyDOM.close()
  }

  process.on("SIGINT", cleanup)
  process.on("SIGTERM", cleanup)
  process.on("exit", cleanup)
}

main().catch((err) => {
  console.error("Error:", err)
  process.exit(1)
})
